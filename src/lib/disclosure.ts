// =============================================================================
// COMPLIANCE-LOCKED copy (SPEC 00 §2.2 canonical disclosure block, referenced by
// SPEC 01 §2 field 6 and SPEC 02 compliance lock).
//
// This text is NOT reskinnable. It is generated here so the EXACT string shown
// next to Checkbox B equals the `consent_text_snapshot` sent to the Aggregator
// (SPEC 01 §8 acceptance criterion). Both the client renderer and the server
// re-validation derive from `buildConsentDisclosure` + `disclosureToPlainText`,
// guaranteeing equality.
//
// Required PEWC elements present below:
//  - recurring automated marketing messages
//  - identified brand + "at the mobile number provided"
//  - "Consent is not a condition of any purchase"
//  - "Msg & data rates may apply"
//  - "Msg frequency varies"
//  - "Reply STOP to cancel" / "HELP for help"
//  - links to Terms and Privacy Policy
// =============================================================================

export type DisclosureLink = "terms" | "privacy";

export interface DisclosureSegment {
  text: string;
  /** When set, render as a link to the corresponding URL. */
  href?: DisclosureLink;
}

export interface DisclosureInput {
  brandName: string;
  termsUrl: string;
  privacyUrl: string;
}

/** Canonical SMS-consent (Checkbox B / PEWC) disclosure as ordered segments. */
export function buildConsentDisclosure({
  brandName,
}: DisclosureInput): DisclosureSegment[] {
  return [
    {
      text:
        `By checking this box, I agree to receive recurring automated marketing ` +
        `text messages (such as promotions and cart reminders) from ${brandName} ` +
        `at the mobile number provided. Consent is not a condition of any purchase. ` +
        `Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel or ` +
        `HELP for help. See our `,
    },
    { text: "Terms", href: "terms" },
    { text: " and " },
    { text: "Privacy Policy", href: "privacy" },
    { text: "." },
  ];
}

/** Canonical Terms & Privacy (Checkbox A) label as ordered segments. */
export function buildTermsLabel({}: DisclosureInput): DisclosureSegment[] {
  return [
    { text: "I agree to the " },
    { text: "Terms", href: "terms" },
    { text: " and " },
    { text: "Privacy Policy", href: "privacy" },
    { text: "." },
  ];
}

/**
 * Flatten segments to the exact visible text. This is what gets snapshotted and
 * what `Element.textContent` of the rendered disclosure equals — they must match.
 */
export function disclosureToPlainText(segments: DisclosureSegment[]): string {
  return segments.map((s) => s.text).join("");
}

/** Convenience: the canonical Checkbox B snapshot string for a given brand. */
export function consentSnapshot(input: DisclosureInput): string {
  return disclosureToPlainText(buildConsentDisclosure(input));
}
