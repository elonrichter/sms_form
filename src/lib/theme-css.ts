// Maps the SPEC 02 design tokens to CSS custom properties injected at :root.
// Components reference these via var(--token), so a reskin (editing theme.ts)
// requires no component changes.
import { theme, type Theme } from "@/config/theme";

export function themeToCssVars(t: Theme = theme): string {
  const vars: Record<string, string> = {
    "--color-bg": t.color.bg,
    "--color-surface": t.color.surface,
    "--color-text": t.color.text,
    "--color-text-muted": t.color.textMuted,
    "--color-primary": t.color.primary,
    "--color-primary-text": t.color.primaryText,
    "--color-border": t.color.border,
    "--color-error": t.color.error,
    "--color-success": t.color.success,
    "--color-legal-text": t.color.legalText,
    "--color-legal-link": t.color.legalLink,

    "--font-heading-stack": t.font.heading,
    "--font-body-stack": t.font.body,
    "--font-h1": t.font.scale.h1,
    "--font-h2": t.font.scale.h2,
    "--font-body-size": t.font.scale.body,
    "--font-small": t.font.scale.small,

    "--radius-sm": t.radius.sm,
    "--radius-md": t.radius.md,
    "--radius-lg": t.radius.lg,
    "--radius-pill": t.radius.pill,

    "--space-xs": t.space.xs,
    "--space-sm": t.space.sm,
    "--space-md": t.space.md,
    "--space-lg": t.space.lg,
    "--space-xl": t.space.xl,

    "--shadow-card": t.shadow.card,
    "--max-width": t.layout.maxWidth,
    "--field-height": t.layout.fieldHeight,
  };

  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `:root {\n${body}\n}`;
}
