/** CSV helpers — one implementation for every export (semicolon-separated, FR/Excel friendly). */

export function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][], header?: string[]): string {
  const all = header ? [header, ...rows] : rows;
  return all.map((row) => row.map(escapeCsv).join(";")).join("\n");
}

/** Minor units → plain decimal string (e.g. 12345 → "123.45"). */
export function minorToPlain(minor: number): string {
  return (minor / 100).toFixed(2);
}
