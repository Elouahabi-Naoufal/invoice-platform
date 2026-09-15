/**
 * Webpack resolve-alias stub for `@aws-sdk/client-s3`.
 *
 * `whatsapp-web.js` → `unzipper` lazily requires the S3 SDK inside its S3
 * helpers, which are only used by RemoteAuth's S3 session backend. We use
 * LocalAuth (disk sessions), so this code path never executes — but the
 * static `require()` breaks Next's server bundling. This stub keeps the
 * build resolvable without adding the heavy AWS SDK dependency.
 */
module.exports = {};
