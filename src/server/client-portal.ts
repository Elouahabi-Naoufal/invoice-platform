"use server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/server/auth";
import { nanoid } from "nanoid";

/** Generate (or return) the secure per-client portal token. */
export async function ensureClientPortalToken(clientId: string) {
  const { ownerId } = await requireWrite();
  const client = await prisma.client.findFirst({ where: { id: clientId, ownerId } });
  if (!client) throw new Error("not found");
  const token = client.portalToken ?? nanoid(32);
  const updated = await prisma.client.update({ where: { id: clientId }, data: { portalToken: token } });
  return { token: updated.portalToken as string };
}

/** Revoke the client's portal access (old URL stops working). */
export async function revokeClientPortalToken(clientId: string) {
  const { ownerId } = await requireWrite();
  const client = await prisma.client.findFirst({ where: { id: clientId, ownerId } });
  if (!client) throw new Error("not found");
  await prisma.client.update({ where: { id: clientId }, data: { portalToken: null } });
  return { ok: true };
}
