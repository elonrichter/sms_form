// =============================================================================
// SPEC 02 §1.1 — Design tokens. THIS is one of only two files a reskin touches
// (the other is brand.config.ts). No functional code depends on the values here.
//
// Compliance lock (SPEC 02): `legalText` MUST stay >= 4.5:1 contrast against
// `surface`. Do not lower its contrast, hide it, or restyle the disclosure into
// invisibility.
// =============================================================================

export const theme = {
  color: {
    bg: "#0B0B0F",
    surface: "#15151C",
    text: "#F5F5F7",
    textMuted: "#A1A1AA",
    primary: "#6D5EF6",
    primaryText: "#FFFFFF",
    border: "#2A2A35",
    error: "#F87171",
    success: "#34D399",
    // Legal copy must remain >= 4.5:1 against `surface` (#15151C).
    // #C9C9D1 on #15151C ~= 11:1 — safe.
    legalText: "#C9C9D1",
    // Disclosure (Terms/Privacy) link color — a lighter primary kept >= 4.5:1
    // against `surface` (#8E81FF on #15151C ~= 5.8:1). The base `primary` is too
    // dark for legal-copy contrast, so links use this token, not `primary`.
    legalLink: "#8E81FF",
  },
  font: {
    // Self-hosted brand faces can be wired via next/font/local in app/layout.tsx
    // and exposed as --font-heading / --font-body. These stacks are the safe,
    // CDN-free fallback (no external blocking font request).
    heading:
      "var(--font-heading), 'Space Grotesk', system-ui, -apple-system, Segoe UI, sans-serif",
    body: "var(--font-body), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    scale: { h1: "2rem", h2: "1.25rem", body: "1rem", small: "0.8125rem" },
  },
  radius: { sm: "8px", md: "12px", lg: "20px", pill: "999px" },
  space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px" },
  shadow: { card: "0 10px 40px rgba(0,0,0,0.35)" },
  layout: { maxWidth: "440px", fieldHeight: "48px" },
} as const;

export type Theme = typeof theme;
