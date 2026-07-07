import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Auditoria",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/Auditoria",
  },
  images: { unoptimized: true },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
