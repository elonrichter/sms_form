import { describe, it, expect } from "vitest";
import {
  validateName,
  validatePhone,
  validateForm,
  type FormValues,
} from "@/lib/validation";

describe("validateName", () => {
  it("requires a non-empty trimmed value", () => {
    expect(validateName("")).toBeDefined();
    expect(validateName("   ")).toBeDefined();
  });
  it("bounds length to 60", () => {
    expect(validateName("a".repeat(61))).toBeDefined();
    expect(validateName("a".repeat(60))).toBeUndefined();
  });
  it("accepts a normal name", () => {
    expect(validateName("Jane")).toBeUndefined();
  });
});

describe("validatePhone", () => {
  it("returns a message for invalid, undefined for valid", () => {
    expect(validatePhone("123", "US")).toBeDefined();
    expect(validatePhone("4158675309", "US")).toBeUndefined();
  });
});

const base: FormValues = {
  firstName: "Jane",
  lastName: "Doe",
  country: "US",
  phone: "4158675309",
  consentTerms: true,
  consentMarketing: true,
};

describe("validateForm — SPEC 01 §3.1 state table", () => {
  it("no phone -> cannot submit", () => {
    expect(validateForm({ ...base, phone: "" }).canSubmit).toBe(false);
  });
  it("valid phone, A checked, B unchecked -> cannot submit", () => {
    expect(
      validateForm({ ...base, consentTerms: true, consentMarketing: false }).canSubmit,
    ).toBe(false);
  });
  it("valid phone, A unchecked, B checked -> cannot submit", () => {
    expect(
      validateForm({ ...base, consentTerms: false, consentMarketing: true }).canSubmit,
    ).toBe(false);
  });
  it("invalid phone, both checked -> cannot submit", () => {
    expect(validateForm({ ...base, phone: "111" }).canSubmit).toBe(false);
  });
  it("valid phone + both checked + names -> can submit", () => {
    expect(validateForm(base).canSubmit).toBe(true);
  });
  it("missing name -> cannot submit", () => {
    expect(validateForm({ ...base, firstName: "" }).canSubmit).toBe(false);
  });
});
