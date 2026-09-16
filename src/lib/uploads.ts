/**
 * Public-upload URL helpers.
 *
 * Files written to `public/` at runtime are NOT served by `next start` (Next
 * builds its public manifest at build time), so uploaded logos/signatures are
 * served through `/api/uploads/[...path]` instead. These helpers map stored
 * paths (legacy `/uploads/...`, new `/api/uploads/...`, or `data:` URIs) to a
 * URL that always resolves.
 */
export function publicUploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  if (path.startsWith("/api/uploads/")) return path;
  return path.replace(/^\/uploads\//, "/api/uploads/");
}

/** Map a stored upload path to a path relative to `public/` (for disk reads). */
export function uploadDiskPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const stripped = path.startsWith("/api/uploads/") ? path.slice(4) : path;
  if (!stripped.startsWith("/uploads/")) return null;
  return stripped.replace(/^\/+/, "");
}
