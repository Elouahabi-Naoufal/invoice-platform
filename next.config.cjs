/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    // whatsapp-web.js pulls optional native/peer modules via RemoteAuth/unzipper;
    // keep it external so the server uses Node require at runtime.
    serverComponentsExternalPackages: ["whatsapp-web.js"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = config.externals;
      if (Array.isArray(externals)) externals.push("whatsapp-web.js");
      else if (externals) config.externals = [externals, "whatsapp-web.js"];
      else config.externals = ["whatsapp-web.js"];
    }
    return config;
  },
};
module.exports = nextConfig;
