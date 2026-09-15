/** @type {import('next').NextConfig} */
import path from "path";

const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    // whatsapp-web.js is server-only; keep it out of client bundles.
    serverComponentsExternalPackages: ["whatsapp-web.js"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Stub unzipper's lazy S3 require (RemoteAuth S3 backend only — unused,
      // we use LocalAuth). Keeps the server bundle resolvable without the AWS SDK.
      config.resolve.alias = {
        ...config.resolve.alias,
        "@aws-sdk/client-s3": path.join(process.cwd(), "src/server/whatsapp-s3-stub.js"),
      };
    }
    return config;
  },
};

export default nextConfig;
