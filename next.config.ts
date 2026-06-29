import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: "/spellbound",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
