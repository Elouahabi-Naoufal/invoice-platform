/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    // whatsapp-web.js is loaded via runtime require (see src/server/whatsapp.ts),
    // never bundled — its optional S3 peer chain stays out of the build.
    serverComponentsExternalPackages: ["whatsapp-web.js"],
  },
};
module.exports = nextConfig;
