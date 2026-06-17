// Country / dial-code list for the <select> (SPEC 01 §2 field 3).
// Primary use case: US/CA only (both NANP / +1). Others are listed but disabled
// because validation/normalization is only implemented for NANP (SPEC 01 §3:
// "others MAY be disabled").

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dialCode: string; // E.164 prefix incl. "+"
  flag: string; // emoji flag (renders in the native <option> + selected value)
  enabled: boolean;
}

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", enabled: true },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", enabled: true },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", enabled: false },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", enabled: false },
];

// Countries we actually validate + normalize (North American Numbering Plan).
export const NANP_COUNTRIES = new Set(["US", "CA"]);

export function isSupportedCountry(code: string): boolean {
  return NANP_COUNTRIES.has(code);
}

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function dialCodeFor(code: string): string {
  return getCountry(code)?.dialCode ?? "+1";
}
