"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";
import { encryptSecret } from "@/lib/crypto";
import { buildTransport, buildGoogleTransport, fromHeader } from "@/server/email-transport";
import { googleConfig } from "@/server/google-oauth";

const schema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(), // blank keeps the stored password
  fromAddress: z.string().email(),
  fromName: z.string().optional().nullable(),
  replyTo: z.string().email().optional().nullable().or(z.literal("")),
  enabled: z.boolean().default(true),
});

export async function getEmailSettings() {
  const { ownerId } = await requireActor();
  const s = await prisma.emailSettings.findUnique({ where: { ownerId } });
  const envFallback = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  const googleAvailable = googleConfig().configured;
  if (!s) return { configured: false, envFallback, googleAvailable };
  return {
    configured: true,
    authType: s.authType,
    googleEmail: s.googleEmail ?? "",
    googleAvailable,
    enabled: s.enabled,
    host: s.host,
    port: s.port,
    secure: s.secure,
    username: s.username ?? "",
    hasPassword: Boolean(s.passwordEnc),
    fromAddress: s.fromAddress,
    fromName: s.fromName ?? "",
    replyTo: s.replyTo ?? "",
    lastTestAt: s.lastTestAt ? s.lastTestAt.toISOString() : null,
    lastTestOk: s.lastTestOk,
    lastTestError: s.lastTestError,
    envFallback,
  };
}

export async function saveEmailSettings(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = schema.parse(raw);
  const existing = await prisma.emailSettings.findUnique({ where: { ownerId } });
  const passwordEnc = d.password ? encryptSecret(d.password) : existing?.passwordEnc ?? null;
  const data = {
    host: d.host.trim(),
    port: d.port,
    secure: d.secure,
    username: d.username?.trim() || null,
    passwordEnc,
    fromAddress: d.fromAddress.trim(),
    fromName: d.fromName?.trim() || null,
    replyTo: d.replyTo?.trim() || null,
    enabled: d.enabled,
  };
  const saved = await prisma.emailSettings.upsert({
    where: { ownerId },
    create: { ownerId, ...data },
    update: data,
  });
  return { ok: true, id: saved.id };
}

export async function testEmailSettings(to: string) {
  const { ownerId } = await requireWrite();
  const s = await prisma.emailSettings.findUnique({ where: { ownerId } });
  if (!s) throw new Error("Connect an email first");
  const { decryptSecret } = await import("@/lib/crypto");
  let transport;
  if (s.authType === "GOOGLE" && s.oauthRefreshTokenEnc) {
    const { clientId, clientSecret } = googleConfig();
    const refreshToken = decryptSecret(s.oauthRefreshTokenEnc);
    if (!clientId || !clientSecret || !refreshToken) throw new Error("Google connection is not configured");
    transport = buildGoogleTransport({ user: s.fromAddress, clientId, clientSecret, refreshToken });
  } else {
    transport = buildTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      username: s.username ?? undefined,
      password: decryptSecret(s.passwordEnc) ?? undefined,
      fromAddress: s.fromAddress,
      fromName: s.fromName ?? undefined,
    });
  }
  try {
    await transport.verify();
    await transport.sendMail({
      from: fromHeader({ fromAddress: s.fromAddress, fromName: s.fromName ?? undefined }),
      to,
      subject: "Email connection test",
      text: "Your email connection works. Invoices and reminders will be sent from this address.",
    });
    await prisma.emailSettings.update({
      where: { ownerId },
      data: { lastTestAt: new Date(), lastTestOk: true, lastTestError: null },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.emailSettings.update({
      where: { ownerId },
      data: { lastTestAt: new Date(), lastTestOk: false, lastTestError: msg.slice(0, 300) },
    });
    throw new Error(msg);
  }
}

export async function disconnectEmailSettings() {
  const { ownerId } = await requireWrite();
  await prisma.emailSettings.deleteMany({ where: { ownerId } });
  return { ok: true };
}
