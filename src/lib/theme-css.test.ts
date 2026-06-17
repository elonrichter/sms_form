import { describe, it, expect } from "vitest";
import { themeToCssVars } from "@/lib/theme-css";
import { theme } from "@/config/theme";

describe("themeToCssVars", () => {
  const css = themeToCssVars();

  it("wraps tokens in a :root block", () => {
    expect(css.startsWith(":root {")).toBe(true);
    expect(css.trimEnd().endsWith("}")).toBe(true);
  });

  it("emits core color tokens", () => {
    expect(css).toContain(`--color-bg: ${theme.color.bg};`);
    expect(css).toContain(`--color-surface: ${theme.color.surface};`);
  });

  it("emits the contrast-safe legal-link token", () => {
    expect(css).toContain(`--color-legal-link: ${theme.color.legalLink};`);
  });

  it("emits layout tokens", () => {
    expect(css).toContain(`--max-width: ${theme.layout.maxWidth};`);
    expect(css).toContain(`--field-height: ${theme.layout.fieldHeight};`);
  });
});
