import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old WordPress site had duplicate index.php-prefixed URLs indexed
      // (e.g. /index.php/blog/). Normalise them to the clean path with a 301.
      {
        source: "/index.php/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
