/** @type {import('next').NextConfig} */

const r2PublicOrigin = (() => {
  try {
    return process.env.R2_PUBLIC_URL
      ? new URL(process.env.R2_PUBLIC_URL).origin
      : "";
  } catch {
    return "";
  }
})();

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,

  // Ensure music files in public/assets/music are bundled/accessible for serverless API routes on Vercel
  outputFileTracingIncludes: {
    "/api/music": ["./public/assets/music/**/*"],
  },

  // Backward-compatible redirects for legacy .html URLs
  async redirects() {
    return [
      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
      {
        source: "/projects.html",
        destination: "/projects",
        permanent: true,
      },
      {
        source: "/clock.html",
        destination: "/",
        permanent: false,
      },
    ];
  },

  // Security & Caching HTTP Headers
  async headers() {
    return [
      {
        source: "/assets/favicon/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/assets/:path((?!favicon).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              `media-src 'self' data: blob: https://*.r2.dev https://*.cloudflarestorage.com ${r2PublicOrigin} https:`.trim(),
              `connect-src 'self' https://*.upstash.io https://*.r2.dev https://*.cloudflarestorage.com ${r2PublicOrigin}`.trim(),
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
