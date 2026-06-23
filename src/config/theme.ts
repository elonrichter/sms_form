// =============================================================================
// SPEC 02 §1.1 — Design tokens. THIS is one of only two files a reskin touches
// (the other is brand.config.ts). No functional code depends on the values here.
//
// Compliance lock (SPEC 02): `legalText` / `legalLink` MUST stay >= 4.5:1 contrast
// against `surface`. Do not lower their contrast, hide them, or restyle the
// disclosure into invisibility.
//
// Current look: soft, light, airy. Rounded sans-serif headings + a clean system
// sans body (no external/blocking font CDN). To ship self-hosted brand fonts,
// wire next/font/local in app/layout.tsx and prepend its CSS var to the stacks
// below as `var(--font-heading, <stack>)`.
// =============================================================================

export const theme = {
  color: {
    bg: "#FFFBF2", // app background — warm white with a soft yellow tint
    surface: "#FFFFFF", // card
    text: "#1F1A15",
    textMuted: "#6B5F50",
    primary: "#D9743C", // Cash Flow Currents orange (matches the logo bubble)
    primaryText: "#FFFFFF",
    border: "#F0E4D2",
    error: "#D92D20",
    success: "#0F9D7A",
    // Legal copy must remain >= 4.5:1 against `surface` (#FFFFFF).
    // #3F3A33 on white ~= 9:1 — safe.
    legalText: "#3F3A33",
    // Disclosure (Terms/Privacy) link color, >= 4.5:1 on white.
    // #9A4A14 (deep amber) on white ~= 5.6:1. The base `primary` is too light
    // on white for links, so links use this dedicated darker token.
    legalLink: "#9A4A14",
  },
  font: {
    // Soft rounded sans for headings; clean system sans for body. No leading
    // undefined var() — that would invalidate the whole font-family declaration.
    heading:
      "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Quicksand, system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    scale: { h1: "1.625rem", h2: "1.0625rem", body: "1rem", small: "0.8125rem" },
  },
  radius: { sm: "8px", md: "12px", lg: "20px", pill: "999px" },
  // Tightened vertical rhythm so the card reads wider and shorter.
  space: { xs: "4px", sm: "8px", md: "12px", lg: "18px", xl: "28px" },
  shadow: { card: "0 6px 24px rgba(17, 17, 26, 0.08)" },
  layout: { maxWidth: "540px", fieldHeight: "46px" },
} as const;

export type Theme = typeof theme;
