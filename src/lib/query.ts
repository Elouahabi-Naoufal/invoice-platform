/**
 * Build a URL query string from the current params plus a patch.
 * Empty patch values remove the key. `drop` lists keys to always remove.
 */
export function buildQueryString(
  path: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string>,
  drop: string[] = []
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  for (const key of drop) params.delete(key);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
