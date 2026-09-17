"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  kind: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  percentBps: z.number().int().min(0).max(100000).default(0),
  fixedMinor: z.number().int().min(0).default(0),
  capMinor: z.number().int().min(0).optional().nullable(),
  appliesTo: z.enum(["ANY", "EMPLOYER", "EMPLOYEE", "EXPENSE"]).default("ANY"),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export async function listRates() {
  const { ownerId } = await requireActor();
  return prisma.rate.findMany({ where: { ownerId, active: true }, orderBy: { name: "asc" } });
}

export async function createRate(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = schema.parse(raw);
  return prisma.rate.create({ data: { ...d, ownerId } as never });
}

export async function updateRate(id: string, raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = schema.partial().parse(raw);
  const r = await prisma.rate.findFirst({ where: { id, ownerId } });
  if (!r) throw new Error("not found");
  return prisma.rate.update({ where: { id }, data: d as never });
}

export async function archiveRate(id: string) {
  const { ownerId } = await requireWrite();
  const r = await prisma.rate.findFirst({ where: { id, ownerId } });
  if (!r) throw new Error("not found");
  return prisma.rate.update({ where: { id }, data: { active: false } });
}
