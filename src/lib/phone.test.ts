import { describe, it, expect } from "vitest";
import {
  digitsOnly,
  nationalDigitCount,
  normalizePhone,
  isValidPhone,
} from "@/lib/phone";

describe("digitsOnly", () => {
  it("strips all non-digit characters", () => {
    expect(digitsOnly("(415) 867-5309")).toBe("4158675309");
    expect(digitsOnly("+1 415.867.5309")).toBe("14158675309");
    expect(digitsOnly("")).toBe("");
    expect(digitsOnly("abc")).toBe("");
  });
});

describe("normalizePhone (US/CA NANP)", () => {
  it("accepts a clean 10-digit number and returns E.164", () => {
    const r = normalizePhone("4158675309", "US");
    expect(r.ok).toBe(true);
    expect(r.e164).toBe("+14158675309");
    expect(r.national).toBe("4158675309");
  });

  it("accepts formatted input", () => {
    expect(normalizePhone("(415) 867-5309", "US").e164).toBe("+14158675309");
  });

  it("strips a duplicated leading country code (11 digits)", () => {
    expect(normalizePhone("14158675309", "US").e164).toBe("+14158675309");
    expect(normalizePhone("+1 (415) 867-5309", "CA").e164).toBe("+14158675309");
  });

  it("rejects empty input as required", () => {
    expect(normalizePhone("", "US")).toMatchObject({ ok: false, reason: "required" });
  });

  it("rejects wrong digit counts", () => {
    expect(normalizePhone("415867530", "US").reason).toBe("length"); // 9
    expect(normalizePhone("415867530912", "US").reason).toBe("length"); // 12
  });

  it("rejects invalid NANP area code (must start 2-9)", () => {
    expect(normalizePhone("1158675309", "US").reason).toBe("area_code");
    expect(normalizePhone("0158675309", "US").reason).toBe("area_code");
  });

  it("rejects invalid NANP exchange (must start 2-9)", () => {
    expect(normalizePhone("4151675309", "US").reason).toBe("exchange");
  });

  it("rejects all-identical digits", () => {
    expect(normalizePhone("2222222222", "US").reason).toBe("repeated");
  });

  it("rejects reserved 555-01xx fictional numbers", () => {
    expect(normalizePhone("4155550100", "US").reason).toBe("reserved");
    expect(normalizePhone("4155550199", "US").reason).toBe("reserved");
    // just outside the reserved range is valid
    expect(normalizePhone("4155550200", "US").ok).toBe(true);
  });

  it("rejects unsupported countries", () => {
    expect(normalizePhone("4158675309", "GB").reason).toBe("unsupported_country");
  });
});

describe("nationalDigitCount", () => {
  it("counts entered national digits, capped at 10", () => {
    expect(nationalDigitCount("415", "US")).toBe(3);
    expect(nationalDigitCount("4158675309", "US")).toBe(10);
    expect(nationalDigitCount("415867530912", "US")).toBe(10);
  });

  it("drops a single leading country code for the count", () => {
    expect(nationalDigitCount("14158675309", "US")).toBe(10);
  });
});

describe("isValidPhone", () => {
  it("is a boolean shortcut over normalizePhone", () => {
    expect(isValidPhone("4158675309", "US")).toBe(true);
    expect(isValidPhone("123", "US")).toBe(false);
  });
});
