"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { z } from "zod";

export async function listMembers(_userId?: string) {
  const u = await requireUser();
  return prisma.member.findMany({ where: { ownerId: u.id, revokedAt: null }, orderBy: { role: "desc" } });
}

export async function inviteMember(userId: string, raw: unknown) {
  const u = await requireUser();
  const d = z.object({ email: z.string().email(), role: z.enum(["ADMIN", "VIEWER"]).default("VIEWER") }).parse(raw);
  return prisma.member.upsert({
    where: { ownerId_email: { ownerId: u.id, email: d.email } },
    create: { ownerId: u.id, email: d.email, role: d.role, invitedAt: new Date() },
    update: { role: d.role },
  });
}

export async function acceptInvite(token: string) {
  const member = await prisma.member.findFirst({ where: { inviteToken: token, acceptedAt: null } });
  if (!member) throw new Error("Invite not found");
  return prisma.member.update({ where: { id: member.id }, data: { acceptedAt: new Date() } });
}

export async function revokeMember(id: string) {
  const u = await requireUser();
  const m = await prisma.member.findFirst({ where: { id: id } });
  if (!m || m.ownerId !== u.id) throw new Error("Member not found");
  return prisma.member.update({ where: { id }, data: { revokedAt: new Date() } });
}