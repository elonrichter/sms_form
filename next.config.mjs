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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
