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
    bg: "#F6F7FB", // app background — soft off-white
    surface: "#FFFFFF", // card
    text: "#16161D",
    textMuted: "#5E5E6B",
    primary: "#6C5CE7", // gentle indigo; white text on it ~4.86:1
    primaryText: "#FFFFFF",
    border: "#E7E7F0",
    error: "#D92D20",
    success: "#0F9D7A",
    // Legal copy must remain >= 4.5:1 against `surface` (#FFFFFF).
    // #3F3F49 on white ~= 9:1 — safe.
    legalText: "#3F3F49",
    // Disclosure (Terms/Privacy) link color, >= 4.5:1 on white.
    // #574FCF on white ~= 6:1. The base `primary` is borderline on white, so
    // links use this dedicated token, not `primary`.
    legalLink: "#574FCF",
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
