/** @type {import('next').NextConfig} */
import path from "path";

// Node-only packages that must never be bundled (Chromium automation stack).
const SERVER_EXTERNALS = [
  "whatsapp-web.js",
  "puppeteer",
  "puppeteer-core",
  "@puppeteer/browsers",
  "proxy-agent",
  "pac-proxy-agent",
  "@tootallnate/quickjs-emscripten",
];

const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    // Keep the WhatsApp/Chromium stack out of every server bundle.
    serverComponentsExternalPackages: SERVER_EXTERNALS,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Stub unzipper's lazy S3 require (RemoteAuth S3 backend only — unused).
      config.resolve.alias = {
        ...config.resolve.alias,
        "@aws-sdk/client-s3": path.join(process.cwd(), "src/server/whatsapp-s3-stub.js"),
      };
      // Externalize the Node-only automation stack for ALL server entries,
      // including the instrumentation hook (which serverComponentsExternalPackages
      // does not cover).
      const prev = config.externals;
      config.externals = [
        ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
        ({ request }, callback) => {
          if (request && SERVER_EXTERNALS.some((e) => request === e || request.startsWith(e + "/"))) {
            return callback(null, "commonjs " + request);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
