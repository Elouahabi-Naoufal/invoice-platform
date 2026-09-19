/** @type {import('next').NextConfig} */
// Node-only packages that must never be bundled (WhatsApp protocol stack).
const SERVER_EXTERNALS = [
  "@whiskeysockets/baileys",
  "libsignal",
  "pino",
  "@hapi/boom",
  "protobufjs",
  "music-metadata",
];

const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    // Keep the Node-only WhatsApp (Baileys) stack out of every server bundle.
    serverComponentsExternalPackages: SERVER_EXTERNALS,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize the Node-only WhatsApp stack for ALL server entries,
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
