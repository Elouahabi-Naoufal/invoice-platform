import { MAX_ERROR_LENGTH } from "@/lib/constants";

/** Collapse any thrown value into a short, log-safe single-line message. */
export function toShortMessage(error: unknown, fallback = "unknown error"): string {
  const raw = error instanceof Error ? error.message : String(error ?? fallback);
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_LENGTH) || fallback;
}

/** Turn a Zod error (or any Error) into a human-readable "field: message" string. */
export function formatZodError(error: unknown): string {
  if (!(error instanceof Error)) return "Save failed";
  try {
    const issues = JSON.parse(error.message) as { path?: (string | number)[]; message: string }[];
    if (Array.isArray(issues)) {
      return issues.map((i) => `${(i.path ?? []).join(".") || "form"}: ${i.message}`).join(" · ");
    }
  } catch {
    // plain message — fall through
  }
  return error.message;
}
