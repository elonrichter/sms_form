import "server-only";

// Optional Cloudflare Turnstile verification (SPEC 01 §6, env-gated).
// If no secret is configured, captcha is disabled (returns ok). When configured,
// a valid token is required.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyCaptcha(
  token: string | undefined,
  secret: string,
  ip?: string,
): Promise<boolean> {
  if (!secret) return true; // captcha disabled
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    clearTimeout(t);

    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
