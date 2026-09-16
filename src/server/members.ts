"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireRole } from "@/server/auth";
import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export async function listMembers(_userId?: string) {
  const { ownerId } = await requireActor();
  return prisma.member.findMany({ where: { ownerId, revokedAt: null }, orderBy: { role: "desc" } });
}

export async function inviteMember(_userId: string, raw: unknown) {
  const actor = await requireRole(["OWNER", "ADMIN"]);
  const d = z.object({ email: z.string().email(), role: z.enum(["ADMIN", "VIEWER"]).default("VIEWER") }).parse(raw);
  const email = d.email.toLowerCase();
  const inviteToken = nanoid(32);
  return prisma.member.upsert({
    where: { ownerId_email: { ownerId: actor.ownerId, email } },
    create: { ownerId: actor.ownerId, email, role: d.role, invitedAt: new Date(), inviteToken },
    update: { role: d.role, inviteToken, revokedAt: null, acceptedAt: null },
  });
}

export async function revokeMember(id: string) {
  const actor = await requireRole(["OWNER", "ADMIN"]);
  const m = await prisma.member.findFirst({ where: { id, ownerId: actor.ownerId } });
  if (!m) throw new Error("Member not found");
  return prisma.member.update({ where: { id }, data: { revokedAt: new Date() } });
}

/** Public: read an invite for the acceptance page (no session required). */
export async function getInvite(token: string) {
  const m = await prisma.member.findFirst({ where: { inviteToken: token, acceptedAt: null, revokedAt: null } });
  if (!m) return null;
  const owner = await prisma.user.findUnique({ where: { id: m.ownerId }, select: { displayName: true } });
  return { email: m.email, role: m.role, orgName: owner?.displayName ?? "the account" };
}

/** Public: accept an invite by creating the member's own login. */
export async function acceptInvite(token: string, raw: { displayName?: string; password?: string }) {
  const m = await prisma.member.findFirst({ where: { inviteToken: token, acceptedAt: null, revokedAt: null } });
  if (!m) throw new Error("Invite not found or already used");
  const password = String(raw?.password ?? "");
  if (password.length < 8) throw new Error("password must be at least 8 characters");
  const email = m.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("an account with this email already exists — please log in");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: String(raw?.displayName ?? "").trim() || m.displayName || email.split("@")[0],
    },
  });
  await prisma.member.update({ where: { id: m.id }, data: { userId: user.id, acceptedAt: new Date(), inviteToken: null } });
  return { ok: true, email };
}
