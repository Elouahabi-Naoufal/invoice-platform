/**
 * Admin session resolution. Intentionally NOT a "use server" module so it is
 * never exposed as a callable endpoint. Server components and server actions
 * import it directly.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE = "hub_session";

export interface AdminActor {
  id: string;
  email: string;
}

export async function requireAdmin(): Promise<AdminActor> {
  const cookie = await cookies();
  const sid = cookie.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sid) throw new Error("not authenticated");
  const admin = await prisma.superAdmin.findUnique({ where: { id: sid } });
  if (!admin) throw new Error("session invalid");
  return { id: admin.id, email: admin.email };
}