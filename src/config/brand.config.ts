// =============================================================================
// SPEC 02 §1.2 — Per-brand strings & assets. THIS is one of only two files a
// reskin touches (the other is theme.ts).
//
// NOTE on `name`: the legally-authoritative brand name for the disclosure comes
// from the BRAND_NAME env var at runtime (SPEC 01). `name` here is the
// build-time default / fallback used when BRAND_NAME is unset.
//
// NONE of the compliance-locked disclosure copy lives here — it is generated
// from src/lib/disclosure.ts and may not be edited per-brand.
// =============================================================================

export type LayoutVariant = "centered-card" | "split-hero" | "full-bleed";

export const brand = {
  name: "Cash Flow Currents", // fallback for BRAND_NAME; also drives the disclosure
  slug: "cashflowcurrents", // fallback for BRAND_SLUG (token is authoritative)
  logoSrc: "/logo.png",
  logoAlt: "Cash Flow Currents",
  headline: "Get exclusive offers by text",
  subhead: "Join the list. No spam — just the good stuff.",
  successTitle: "You're in 🎉",
  successBody: "Watch for a confirmation text shortly.",
  duplicateTitle: "You're already on the list",
  duplicateBody: "Looks like this number is already subscribed. Nothing else to do!",
  errorTitle: "Something went wrong",
  errorBody: "Something went wrong on our end. Please try again in a moment.",
  tryAgainLabel: "Try again",
  heroSrc: "/brand/hero.svg", // optional; used by split-hero / full-bleed
  layoutVariant: "centered-card" as LayoutVariant, // see SPEC 02 §3
} as const;

export type Brand = typeof brand;
