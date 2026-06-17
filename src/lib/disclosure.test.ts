import { describe, it, expect } from "vitest";
import {
  buildConsentDisclosure,
  buildTermsLabel,
  disclosureToPlainText,
  consentSnapshot,
} from "@/lib/disclosure";

const input = {
  brandName: "Acme Co",
  termsUrl: "https://acme.test/terms",
  privacyUrl: "https://acme.test/privacy",
};

describe("buildConsentDisclosure (PEWC, compliance-locked)", () => {
  const text = disclosureToPlainText(buildConsentDisclosure(input));

  it("contains every required PEWC element", () => {
    expect(text).toContain("recurring automated marketing");
    expect(text).toContain("Acme Co");
    expect(text).toContain("not a condition of any purchase");
    expect(text).toContain("Msg & data rates may apply");
    expect(text).toContain("Msg frequency varies");
    expect(text).toContain("Reply STOP to cancel");
    expect(text).toContain("HELP for help");
    expect(text).toContain("Terms");
    expect(text).toContain("Privacy Policy");
  });

  it("exposes Terms and Privacy as link segments", () => {
    const hrefs = buildConsentDisclosure(input)
      .filter((s) => s.href)
      .map((s) => s.href);
    expect(hrefs).toEqual(["terms", "privacy"]);
  });
});

describe("consentSnapshot", () => {
  it("equals the flattened disclosure text (snapshot integrity)", () => {
    expect(consentSnapshot(input)).toBe(
      disclosureToPlainText(buildConsentDisclosure(input)),
    );
  });

  it("interpolates the brand name", () => {
    expect(consentSnapshot({ ...input, brandName: "Other Brand" })).toContain(
      "Other Brand",
    );
  });

  it("is independent of the URLs (only the visible words are snapshotted)", () => {
    const a = consentSnapshot(input);
    const b = consentSnapshot({ ...input, termsUrl: "https://x", privacyUrl: "https://y" });
    expect(a).toBe(b);
  });
});

describe("buildTermsLabel", () => {
  it("links Terms and Privacy Policy", () => {
    const hrefs = buildTermsLabel(input)
      .filter((s) => s.href)
      .map((s) => s.href);
    expect(hrefs).toEqual(["terms", "privacy"]);
  });
});
