import "server-only";
import { brand } from "@/config/brand.config";

// Server-only env access (SPEC 01 §1.1). Secrets here must NEVER be imported by
// client components. The `server-only` import makes a client import a build error.

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = "MissingEnvError";
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new MissingEnvError(name);
  return v;
}

/** Required env that must be an absolute http(s) URL (fail closed). */
function requiredUrl(name: string): string {
  const v = required(name).trim();
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new MissingEnvError(`${name} (must be an absolute http(s) URL)`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new MissingEnvError(`${name} (must be an absolute http(s) URL)`);
  }
  return v;
}

/** Secrets + server config. Call only inside the route handler (runtime). */
export function getServerEnv() {
  return {
    aggregatorUrl: requiredUrl("AGGREGATOR_API_URL").replace(/\/+$/, ""),
    aggregatorToken: required("AGGREGATOR_API_TOKEN"),
    brandSlug: process.env.BRAND_SLUG ?? brand.slug,
    // Required so the forwarded consent_text_version cannot silently default and
    // disagree with the disclosure snapshot it is meant to stamp.
    consentTextVersion: required("CONSENT_TEXT_VERSION"),
    captchaSecret: process.env.CAPTCHA_SECRET ?? "",
  };
}

/**
 * Non-secret brand runtime values, resolved per-request (the page is dynamic —
 * see src/app/page.tsx). NOT secrets, so no NEXT_PUBLIC_ prefix: they never
 * enter the client bundle, only the server-rendered props.
 *
 * The Terms/Privacy URLs are part of the compliance-LOCKED disclosure, so they
 * fail closed (required absolute URLs) rather than silently rendering a dead "#".
 */
export function getPublicBrandRuntime() {
  return {
    brandName: process.env.BRAND_NAME ?? brand.name,
    termsUrl: requiredUrl("SMS_TERMS_URL"),
    privacyUrl: requiredUrl("PRIVACY_URL"),
    defaultCountry: (process.env.DEFAULT_COUNTRY ?? "US").toUpperCase(),
    captchaSiteKey: process.env.CAPTCHA_SITE_KEY ?? "",
  };
}
