import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),

  // ── Webpack cache disabled (keeps Vercel build cache stable) ──────────────
  webpack: (config) => {
    config.cache = false;
    return config;
  },

  // ── Environment: expose backend URL to the browser ─────────────────────────
  // Override NEXT_PUBLIC_API_URL in the Vercel dashboard after deploying the
  // Hugging Face backend.  The value below is the default.
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "https://manish111913-ai-jd.hf.space",
  },

  // ── Image domains (add if you ever serve remote images) ────────────────────
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
