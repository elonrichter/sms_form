import "server-only";

// PII-safe logging (SPEC 01 §1, §4.1.7, §8: "No phone numbers appear in logs").
// Belt-and-suspenders: we never pass phone numbers to the logger, AND we redact
// anything that looks like one before it is written.

const E164_RE = /\+?\d[\d\s().-]{8,}\d/g;

export function redact(value: unknown): string {
  let s: string;
  try {
    s = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    s = String(value);
  }
  return s.replace(E164_RE, "[redacted-number]");
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  const suffix = meta ? ` ${redact(meta)}` : "";
  console.log(`[subscribe] ${redact(message)}${suffix}`);
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  const suffix = meta ? ` ${redact(meta)}` : "";
  console.error(`[subscribe] ${redact(message)}${suffix}`);
}
