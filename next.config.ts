import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack handles WASM natively; this silences the "webpack config but no turbopack config" warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
