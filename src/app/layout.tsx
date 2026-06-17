import type { Metadata, Viewport } from "next";
import { themeToCssVars } from "@/lib/theme-css";
import { brand } from "@/config/brand.config";
import { theme } from "@/config/theme";
import "./globals.css";

// To use self-hosted brand fonts (SPEC 02 §5), wire next/font/local here and set
// --font-heading / --font-body on <html>. Example:
//   import localFont from "next/font/local";
//   const display = localFont({ src: "../fonts/ClashDisplay.woff2", variable: "--font-heading" });
// The token stacks in theme.ts already fall back cleanly when unset.

export const metadata: Metadata = {
  title: `${brand.name} — Text Sign-Up`,
  description: brand.subhead,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: theme.color.bg,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* SPEC 02: design tokens injected as CSS variables; a reskin edits theme.ts only. */}
        <style
          id="theme-tokens"
          dangerouslySetInnerHTML={{ __html: themeToCssVars() }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
