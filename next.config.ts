import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Playwright drives the dev server over 127.0.0.1 rather than localhost, and
  // Next blocks its dev resources cross-origin by default — which leaves the
  // page rendered but never hydrated, so every click in a test is a no-op.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatar.vercel.sh" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "ui.shadcn.com" },
    ],
  },
}

export default nextConfig
