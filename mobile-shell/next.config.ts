import type { NextConfig } from "next";

// Genuinely separate Next.js project (not just a config toggle) -- Next's
// output:'export' is all-or-nothing for a build, and the main
// nirvana-agent-oss app has dozens of server-rendered/cookie-reading routes
// (admin pages, all of /api/*) that can never be statically exported. This
// project contains only the two routes Capacitor bundles locally (/agent,
// /login); everything else stays exactly where it is, deployed normally on
// Vercel, and this shell calls it over the network like any other API
// client would.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
