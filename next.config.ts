import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Playwright drives the dev server over 127.0.0.1 rather than localhost, and
  // Next blocks its dev resources cross-origin by default — which leaves the
  // page rendered but never hydrated, so every click in a test is a no-op.
  // The LAN address lets a phone on the same Wi-Fi load the dev server.
  // The LAN entry has to match whatever address this machine currently has;
  // a stale one blocks the scripts and the page renders but never hydrates.
  allowedDevOrigins: ["127.0.0.1", "192.168.10.149", "192.168.0.101"],
  // forbidden() and app/forbidden.tsx — the Permission Denied screen.
  experimental: { authInterrupts: true },
  // The patient app's web build (mobile/, `npm run build:web`) is served from
  // public/app. Its files are found as they are; any other /app path, like
  // the invitation's /app/activate?email=... link, loads the app's page and
  // the app routes it.
  async rewrites() {
    return [
      { source: "/app", destination: "/app/index.html" },
      { source: "/app/:path*", destination: "/app/index.html" },
    ]
  },
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
