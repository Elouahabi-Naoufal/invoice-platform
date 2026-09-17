import { prisma } from "@/lib/prisma";

export async function safeFindMany<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (e) {
    console.error("[safeFindMany]", e instanceof Error ? e.message : e);
    return fallback;
  }
}

/** Parse JSON without throwing; returns the fallback on null/empty/invalid input. */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Parse a JSON array, tolerating null/invalid/non-array values. */
export function parseJsonArray<T>(raw: string | null | undefined): T[] {
  const value = safeJsonParse<unknown>(raw, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Structured-clone via JSON — strips Prisma types before passing to client components. */
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

