import "server-only";

// Basic in-memory per-IP rate limiter (SPEC 01 §6 "rate-limit ... per IP (basic)").
// NOTE: serverless instances don't share memory, so this is best-effort per
// instance — it slows scripted abuse but is not a distributed guarantee. For a
// hard limit, front this with a shared store (e.g. Upstash/Vercel KV) or the
// platform's edge rate limiting.

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000; // crude memory cap

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (buckets.size > MAX_KEYS) buckets.clear();

  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  const count = bucket.timestamps.length;
  const allowed = count <= limit;
  const oldest = bucket.timestamps[0] ?? now;
  const retryAfterSec = allowed ? 0 : Math.ceil((oldest + windowMs - now) / 1000);

  return { allowed, remaining: Math.max(0, limit - count), retryAfterSec };
}

/** Derive a client IP from common proxy headers (Vercel sets x-forwarded-for). */
export function clientIpFrom(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
