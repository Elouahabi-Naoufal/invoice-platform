import { prisma } from "@/lib/prisma";

export async function safeFindMany<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (e) {
    console.error("[safeFindMany]", e instanceof Error ? e.message : e);
    return fallback;
  }
}
