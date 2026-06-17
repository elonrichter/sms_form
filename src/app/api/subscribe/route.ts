// Internal route handler: POST /api/subscribe (SPEC 01 §4.1).
// Runs server-side only. Attaches the secret bearer token and forwards to the
// Aggregator. The browser never sees the token.
import { NextResponse } from "next/server";
import { getServerEnv, getPublicBrandRuntime, MissingEnvError } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";
import { validateName } from "@/lib/validation";
import { consentSnapshot } from "@/lib/disclosure";
import { isSupportedCountry } from "@/lib/countries";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";
import { logInfo, logError } from "@/lib/logger";
import type { SubscribeRequestBody, SubscribeResponse } from "@/types";

// Node runtime: needs crypto.randomUUID + outbound fetch with secret env.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGGREGATOR_TIMEOUT_MS = 10_000;

function json(body: SubscribeResponse, status: number) {
  return NextResponse.json(body, { status });
}

function fail(message: string, status: number): NextResponse {
  return json({ success: false, message }, status);
}

const GENERIC_ERROR =
  "Something went wrong on our end. Please try again in a moment.";

export async function POST(req: Request): Promise<NextResponse> {
  // --- Resolve config (fail closed if secrets are missing) -------------------
  let env: ReturnType<typeof getServerEnv>;
  let publicRt: ReturnType<typeof getPublicBrandRuntime>;
  try {
    env = getServerEnv();
    publicRt = getPublicBrandRuntime();
  } catch (e) {
    if (e instanceof MissingEnvError) {
      logError("Server misconfigured (missing env).");
      return fail(GENERIC_ERROR, 500);
    }
    throw e;
  }

  // --- Parse body ------------------------------------------------------------
  let body: SubscribeRequestBody;
  try {
    body = (await req.json()) as SubscribeRequestBody;
  } catch {
    return fail("Invalid request.", 400);
  }

  // --- Honeypot: silently accept bots without forwarding (SPEC 01 §6) --------
  if (typeof body.hp_field === "string" && body.hp_field.trim() !== "") {
    logInfo("Honeypot triggered; dropping submission.");
    return json({ success: true }, 200);
  }

  // --- Rate limit per IP (SPEC 01 §6) ----------------------------------------
  const ip = clientIpFrom(req.headers);
  const rl = rateLimit(`subscribe:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    const res = fail("Too many attempts. Please wait a moment and try again.", 429);
    if (rl.retryAfterSec > 0) res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  // --- Optional captcha (SPEC 01 §6) -----------------------------------------
  if (env.captchaSecret) {
    const ok = await verifyCaptcha(body.captcha_token, env.captchaSecret, ip);
    if (!ok) return fail("Captcha verification failed. Please try again.", 422);
  }

  // --- Re-validate everything server-side (SPEC 01 §3) -----------------------
  if (validateName(body.first_name) || validateName(body.last_name)) {
    return fail("Please enter your first and last name.", 422);
  }

  const country = (body.country ?? "").toUpperCase();
  if (!isSupportedCountry(country)) {
    return fail("This country isn't supported yet.", 422);
  }

  // Trust the raw phone the client normalized, but re-derive E.164 ourselves.
  const phone = normalizePhone(body.phone_e164 ?? "", country);
  if (!phone.ok || !phone.e164) {
    return fail("Please enter a valid phone number.", 422);
  }

  // Both checkboxes are mandatory (§3.1). No phone => already rejected above.
  if (body.consent_terms !== true || body.consent_marketing !== true) {
    return fail("Both consent boxes must be checked.", 422);
  }

  // --- Snapshot integrity: server re-derives the canonical disclosure --------
  // Guarantees consent_text_snapshot == the exact compliance copy for this brand
  // and rejects tampered/stale client snapshots (version skew).
  const canonicalSnapshot = consentSnapshot({
    brandName: publicRt.brandName,
    termsUrl: publicRt.termsUrl,
    privacyUrl: publicRt.privacyUrl,
  });
  if (body.consent_text_snapshot !== canonicalSnapshot) {
    logError("Consent snapshot mismatch (version skew / tamper).");
    return fail("Please reload the page and try again.", 422);
  }

  // --- Build outbound request to the Aggregator (SPEC 01 §4.2) ---------------
  const idempotencyKey =
    typeof body.idempotency_key === "string" && body.idempotency_key.length > 0
      ? body.idempotency_key
      : crypto.randomUUID();

  const outbound = {
    brand_slug: env.brandSlug,
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
    country,
    phone_e164: phone.e164,
    consent_terms: true,
    consent_marketing: true,
    consent_text_version: env.consentTextVersion,
    consent_text_snapshot: canonicalSnapshot,
    form_url: typeof body.form_url === "string" ? body.form_url : "",
    user_agent: req.headers.get("user-agent") ?? "",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGGREGATOR_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${env.aggregatorUrl}/v1/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.aggregatorToken}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(outbound),
      signal: controller.signal,
      cache: "no-store",
    });

    let data: unknown = null;
    try {
      data = await upstream.json();
    } catch {
      /* non-JSON upstream response */
    }

    const payload = (data ?? {}) as {
      success?: boolean;
      status?: string;
      duplicate?: boolean;
      error?: { code?: string; message?: string };
    };

    // Note: status/duplicate are non-PII; phone is never logged.
    logInfo("Aggregator responded.", {
      http: upstream.status,
      ok: upstream.ok,
      status: payload.status,
      duplicate: payload.duplicate,
    });

    if (upstream.ok && payload.success) {
      return json(
        {
          success: true,
          status: payload.status ?? "opted_in",
          duplicate: payload.duplicate === true,
        },
        200,
      );
    }

    // Surface a friendly message; never leak raw aggregator error codes (§5).
    return fail(GENERIC_ERROR, upstream.status >= 400 && upstream.status < 500 ? 422 : 502);
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    logError(aborted ? "Aggregator request timed out." : "Aggregator request failed.");
    return fail(GENERIC_ERROR, 502);
  } finally {
    clearTimeout(timeout);
  }
}

// Reject other methods cleanly.
export function GET() {
  return fail("Method not allowed.", 405);
}
