// Phone validation + E.164 normalization (SPEC 01 §3).
// Pure functions — imported by BOTH the client (live validation) and the server
// route handler (authoritative re-validation). Never trust the client alone.
import { NANP_COUNTRIES } from "@/lib/countries";

export type PhoneReason =
  | "required"
  | "unsupported_country"
  | "length"
  | "area_code"
  | "exchange"
  | "repeated"
  | "reserved";

export interface PhoneResult {
  ok: boolean;
  /** E.164, e.g. "+15551234567" (only when ok). */
  e164?: string;
  /** 10-digit national number (only when ok). */
  national?: string;
  reason?: PhoneReason;
}

/** Strip every non-digit character. */
export function digitsOnly(input: string): string {
  return (input ?? "").replace(/\D+/g, "");
}

/**
 * The count of meaningful national digits the user has entered so far, for the
 * live "X/10" counter. Drops a single leading "1" (NANP country code) so typing
 * "1 555…" doesn't read as 11.
 */
export function nationalDigitCount(input: string, country: string): number {
  let d = digitsOnly(input);
  if (NANP_COUNTRIES.has(country) && d.length === 11 && d.startsWith("1")) {
    d = d.slice(1);
  }
  return Math.min(d.length, 10);
}

/**
 * Validate + normalize to E.164. For US/CA: exactly 10 national digits after
 * stripping a duplicated leading "1"; NANP structural rules; reject all-same
 * and reserved 555-01xx test numbers.
 */
export function normalizePhone(input: string, country: string): PhoneResult {
  const raw = digitsOnly(input);
  if (raw.length === 0) return { ok: false, reason: "required" };

  if (!NANP_COUNTRIES.has(country)) {
    return { ok: false, reason: "unsupported_country" };
  }

  // Reject leading "1" duplication: "+1 555…" / "1555…" -> drop the country code.
  let local = raw;
  if (local.length === 11 && local.startsWith("1")) {
    local = local.slice(1);
  }

  if (local.length !== 10) return { ok: false, reason: "length" };

  const area = local.slice(0, 3);
  const exchange = local.slice(3, 6);
  const line = local.slice(6);

  // NANP: area code and exchange must start with 2-9; middle digits 0-9.
  if (!/^[2-9]\d{2}$/.test(area)) return { ok: false, reason: "area_code" };
  if (!/^[2-9]\d{2}$/.test(exchange)) return { ok: false, reason: "exchange" };

  // Reject obviously invalid patterns: all identical digits (e.g. 0000000000).
  if (/^(\d)\1{9}$/.test(local)) return { ok: false, reason: "repeated" };

  // Reject reserved fictional 555-0100..555-0199 numbers.
  if (exchange === "555" && line >= "0100" && line <= "0199") {
    return { ok: false, reason: "reserved" };
  }

  return { ok: true, e164: `+1${local}`, national: local };
}

export function isValidPhone(input: string, country: string): boolean {
  return normalizePhone(input, country).ok;
}
