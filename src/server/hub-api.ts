/**
 * Hub API core — used by the admin's server actions AND by the router container
 * (via /api/hub/*). Keeps registration + tenant resolution in one place.
 */
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { tenantDomain } from "@/server/tenant-domain";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  requestedSlug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(40, "Slug must be at most 40 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"),
});

export type RegistrationInput = z.infer<typeof registerSchema>;

/** Validate + persist a registration. Returns a friendly error instead of throwing. */
export async function createRegistration(raw: unknown): Promise<{ ok?: true; error?: string; id?: string }> {
  const obj = (typeof raw === "object" && raw ? { ...(raw as Record<string, unknown>) } : {}) as Record<string, unknown>;
  if (typeof obj.requestedSlug === "string") obj.requestedSlug = obj.requestedSlug.toLowerCase().trim();

  const parsed = registerSchema.safeParse(obj);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const existing = await prisma.registration.findUnique({ where: { requestedSlug: d.requestedSlug } });
  if (existing) {
    if (existing.status === "REJECTED") {
      await prisma.registration.delete({ where: { id: existing.id } }).catch(() => undefined);
    } else {
      return { error: "That slug is already taken. Please choose another." };
    }
  }

  try {
    const reg = await prisma.registration.create({ data: { ...d, status: "PENDING" } });
    const { enqueueRegistrationNotification } = await import("@/server/notifications");
    await enqueueRegistrationNotification(reg.id, "REGISTRATION_RECEIVED").catch(() => undefined);
    return { ok: true, id: reg.id };
  } catch {
    return { error: "Could not save your registration. Please try again." };
  }
}

/** Resolve an email to its tenant workspace (used by the router's sign-in). */
export async function resolveTenantByEmail(email: string): Promise<{ found: boolean; domain?: string; url?: string; companyName?: string; status?: string }> {
  const key = String(email ?? "").toLowerCase().trim();
  if (!key) return { found: false };
  const tenant = await prisma.tenant.findFirst({ where: { email: key }, orderBy: { createdAt: "desc" } });
  if (!tenant) return { found: false };
  return {
    found: true,
    domain: tenantDomain(tenant.slug),
    url: tenant.deploymentUrl || `https://${tenantDomain(tenant.slug)}`,
    companyName: tenant.companyName,
    status: tenant.status,
  };
}