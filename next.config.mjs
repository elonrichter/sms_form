/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The form app persists no PII and ships nothing brand-secret to the client.
  // The Aggregator token lives only in the server route handler (never NEXT_PUBLIC_*).
  poweredByHeader: false,
  // Linting runs as a dedicated CI/pre-commit step (npm run lint), not coupled
  // to the production build, so a style nit can never block a deploy.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // NOTE: X-Frame-Options is intentionally omitted. It only supports
          // DENY / SAMEORIGIN and cannot allow a specific cross-origin parent
          // (the form runs on a subdomain, the embed lives on the apex domain).
          // Framing is controlled by the CSP `frame-ancestors` directive below,
          // which modern browsers honor over X-Frame-Options.
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://cashflowcurrents.com https://*.cashflowcurrents.com;",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
