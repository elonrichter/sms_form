// Shared form validation (SPEC 01 §3 + §3.1 state table).
// Pure — used for live client UX and authoritative server re-validation.
import { normalizePhone } from "@/lib/phone";

export const NAME_MIN = 1;
export const NAME_MAX = 60;

export interface FormValues {
  firstName: string;
  lastName: string;
  country: string;
  phone: string; // raw user input
  consentTerms: boolean;
  consentMarketing: boolean;
}

export interface FieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  consentTerms?: string;
  consentMarketing?: string;
}

export function validateName(value: string): string | undefined {
  const v = (value ?? "").trim();
  if (v.length < NAME_MIN) return "Required.";
  if (v.length > NAME_MAX) return `Must be ${NAME_MAX} characters or fewer.`;
  return undefined;
}

const PHONE_MESSAGES: Record<string, string> = {
  required: "Phone number is required.",
  unsupported_country: "This country isn't supported yet.",
  length: "Enter a 10-digit phone number.",
  area_code: "That area code isn't valid.",
  exchange: "That phone number isn't valid.",
  repeated: "That phone number isn't valid.",
  reserved: "That phone number isn't valid.",
};

export function validatePhone(phone: string, country: string): string | undefined {
  const res = normalizePhone(phone, country);
  if (res.ok) return undefined;
  return PHONE_MESSAGES[res.reason ?? "length"] ?? "That phone number isn't valid.";
}

export interface ValidationResult {
  valid: boolean;
  errors: FieldErrors;
  /** True only when every §3.1 condition for a submittable form is met. */
  canSubmit: boolean;
}

/**
 * Full validation implementing SPEC 01 §3 / §3.1:
 *  - names required & length-bounded
 *  - phone required & valid (E.164-normalizable)
 *  - BOTH checkboxes required
 * `canSubmit` is true only when all of the above hold.
 */
export function validateForm(values: FormValues): ValidationResult {
  const errors: FieldErrors = {};

  const fn = validateName(values.firstName);
  if (fn) errors.firstName = fn;
  const ln = validateName(values.lastName);
  if (ln) errors.lastName = ln;

  const phoneErr = validatePhone(values.phone, values.country);
  if (phoneErr) errors.phone = phoneErr;

  // Phone is required for any submission; if marketing consent is checked the
  // phone is likewise required (SPEC 01 §3). Both collapse to "phone valid".
  if (!values.consentTerms) errors.consentTerms = "Please accept to continue.";
  if (!values.consentMarketing) {
    errors.consentMarketing = "Please accept to continue.";
  }

  const valid = Object.keys(errors).length === 0;
  return { valid, errors, canSubmit: valid };
}
