import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site — every route is prerendered, so it can be hosted
  // anywhere that serves static files (Hostinger shared hosting, S3, etc.)
  // as well as Vercel. Run `npm run build` and upload the generated `out/`.
  output: "export",
  // `pricing/index.html` instead of `pricing.html` — the layout static file
  // hosts (including Hostinger) expect for clean URLs.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
