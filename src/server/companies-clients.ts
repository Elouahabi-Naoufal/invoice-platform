"use server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { companySchema, clientSchema } from "@/server/validation";

/** All queries scoped to ownerId — IDOR-safe by construction. */
export async function listCompanies() {
  const u = await requireUser();
  return prisma.company.findMany({ where: { ownerId: u.id, archived: false }, orderBy: { createdAt: "asc" } });
}

export async function getCompany(id: string) {
  const u = await requireUser();
  const c = await prisma.company.findFirst({ where: { id, ownerId: u.id } });
  if (!c) throw new Error("not found");
  return c;
}

export async function createCompany(raw: unknown) {
  const u = await requireUser();
  const d = companySchema.parse(raw);
  return prisma.company.create({ data: { ...d, ownerId: u.id } as never });
}

export async function updateCompany(id: string, raw: unknown) {
  const u = await requireUser();
  const d = companySchema.partial().parse(raw);
  const c = await prisma.company.findFirst({ where: { id, ownerId: u.id } });
  if (!c) throw new Error("not found");
  return prisma.company.update({ where: { id }, data: d as never });
}

export async function archiveCompany(id: string) {
  const u = await requireUser();
  const c = await prisma.company.findFirst({ where: { id, ownerId: u.id }, include: { invoices: { take: 1 } } });
  if (!c) throw new Error("not found");
  // History-preserving: never hard-delete a company with invoices; archive instead.
  return prisma.company.update({ where: { id }, data: { archived: true } });
}

const LOGO_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Logo upload: validated image → public/uploads/logos/<companyId>.<ext>, path stored on company. */
export async function uploadLogo(companyId: string, form: FormData) {
  const u = await requireUser();
  const c = await prisma.company.findFirst({ where: { id: companyId, ownerId: u.id } });
  if (!c) throw new Error("not found");
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) throw new Error("no file");
  if (file.size > 2 * 1024 * 1024) throw new Error("logo must be under 2 MB");
  const ext = LOGO_MIME[file.type];
  if (!ext) throw new Error("logo must be PNG, JPEG or WebP");
  const dir = path.join(process.cwd(), "public", "uploads", "logos");
  await fs.mkdir(dir, { recursive: true });
  // Remove previous logo regardless of extension (filename is owner-scoped, never user input)
  for (const e of Object.values(LOGO_MIME)) {
    try { await fs.unlink(path.join(dir, `${companyId}.${e}`)); } catch { /* absent */ }
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, `${companyId}.${ext}`), bytes);
  const logoPath = `/uploads/logos/${companyId}.${ext}`;
  return prisma.company.update({ where: { id: companyId }, data: { logoPath } });
}

/** Resolve a stored logoPath for server-side PDF rendering (disk → data URI). */
export async function logoDataUri(logoPath: string | null | undefined): Promise<string | null> {
  if (!logoPath || !logoPath.startsWith("/uploads/")) return null;
  try {
    const abs = path.join(process.cwd(), "public", logoPath.replace(/^\/+/, ""));
    if (!abs.startsWith(path.join(process.cwd(), "public"))) return null; // traversal guard
    const buf = await fs.readFile(abs);
    const ext = path.extname(abs).slice(1).toLowerCase();
    const mime = ext === "jpg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function listClients(q?: string) {
  const u = await requireUser();
  return prisma.client.findMany({
    where: { ownerId: u.id, ...(q ? { OR: [{ name: { contains: q } }, { companyName: { contains: q } }, { email: { contains: q } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getClient(id: string) {
  const u = await requireUser();
  const c = await prisma.client.findFirst({ where: { id, ownerId: u.id } });
  if (!c) throw new Error("not found");
  return c;
}

export async function createClient(raw: unknown) {
  const u = await requireUser();
  const d = clientSchema.parse(raw);
  return prisma.client.create({ data: { ...d, ownerId: u.id } as never });
}

export async function updateClient(id: string, raw: unknown) {
  const u = await requireUser();
  const d = clientSchema.partial().parse(raw);
  const c = await prisma.client.findFirst({ where: { id, ownerId: u.id } });
  if (!c) throw new Error("not found");
  return prisma.client.update({ where: { id }, data: d as never });
}
