import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const revision =
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_REVISION;
    if (!revision || !/^[a-f0-9]{40}$/i.test(revision)) return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Lumi-Revision", value: revision.toLowerCase() }],
      },
    ];
  },
};

export default nextConfig;
