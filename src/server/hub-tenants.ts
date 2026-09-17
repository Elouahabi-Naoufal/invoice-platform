"use server";
import { hubPrisma } from "@/lib/hub-prisma";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  companyName: z.string().min(1),
  subdomain: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "only lowercase letters, numbers and hyphens"),
});

export async function registerTenant(raw: unknown) {
  const d = registerSchema.parse(raw);
  const exists = await hubPrisma.tenant.findUnique({ where: { subdomain: d.subdomain } });
  if (exists) throw new Error("This subdomain is already taken.");
  await hubPrisma.tenant.create({ data: { ...d, status: "PENDING" } });
  return { ok: true };
}