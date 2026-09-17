import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { sendInvoiceViaWhatsApp } from "@/server/whatsapp-send";
import {
  isWhatsAppSendLocked,
  normalizeWhatsAppRecipient,
  renderWhatsAppTemplate,
  validateWhatsAppTemplate,
} from "@/server/whatsapp-message";
import type { WhatsAppGateway } from "@/server/whatsapp";

const suffix = `wa${Date.now()}${Math.floor(Math.random() * 1000000)}`;
let ownerId = "";
let otherOwnerId = "";
let companyId = "";
let clientId = "";

process.env.NEXT_PUBLIC_APP_URL ||= "https://example.test";

interface FakeCall {
  chatId: string;
  caption: string;
  pdfLength?: number;
  filename?: string;
}

function fakeGateway(behavior: { registered?: boolean; fail?: string } = {}): { gateway: WhatsAppGateway; calls: FakeCall[] } {
  const calls: FakeCall[] = [];
  const gateway: WhatsAppGateway = {
    async ensureReady() {
      return { account: "test@c.us" };
    },
    async resolveChatId(digits: string) {
      if (behavior.registered === false) return null;
      return `${digits}@c.us`;
    },
    async sendDocument(doc) {
      calls.push({ chatId: doc.chatId, caption: doc.caption, pdfLength: doc.pdf.length, filename: doc.filename });
      if (behavior.fail) throw new Error(behavior.fail);
      return { messageId: "wamid.test123" };
    },
    async sendText(chatId, text) {
      calls.push({ chatId, caption: text, pdfLength: 0, filename: "text" });
      if (behavior.fail) throw new Error(behavior.fail);
      return { messageId: "wamid.text123" };
    },
  };
  return { gateway, calls };
}

const lineSnapshot = JSON.stringify([
  {
    description: "Prestation",
    quantityMilli: 1000,
    unit: "piece",
    unitPriceMinor: 10000,
    discountBps: 0,
    taxRateBps: 2000,
    taxExempt: false,
  },
]);

async function makeInvoice(data: Record<string, unknown> = {}) {
  return prisma.invoice.create({
    data: {
      ownerId,
      companyId,
      clientId,
      status: "ISSUED",
      docType: "FACTURE",
      currency: "MAD",
      issueDate: new Date("2026-05-01"),
      dueDate: new Date("2026-05-31"),
      subtotalHT: 10000,
      totalTVA: 2000,
      totalTTC: 12000,
      publicToken: `wa-token-${suffix}-${Math.floor(Math.random() * 1000000)}`,
      sellerSnapshot: JSON.stringify({ legalName: "Atlas SARL", tradeName: "Atlas", phone: "+212600000000" }),
      buyerSnapshot: JSON.stringify({ name: "Client Test", companyName: "Client SA", phone: "+212661234567" }),
      linesSnapshot: lineSnapshot,
      whatsappStatus: "NOT_SENT",
      ...data,
    },
  });
}

beforeAll(async () => {
  const owner = await prisma.user.create({ data: { email: `${suffix}@t.ma`, passwordHash: "x", displayName: "WA" } });
  const other = await prisma.user.create({ data: { email: `${suffix}-other@t.ma`, passwordHash: "x", displayName: "WA2" } });
  ownerId = owner.id;
  otherOwnerId = other.id;
  const company = await prisma.company.create({
    data: {
      ownerId,
      legalName: "Atlas SARL",
      tradeName: "Atlas",
      address: "1 rue Test",
      whatsappEnabled: true,
      whatsappTemplate: "Hello {buyer}, {docType} {number}: {amount} {currency}. {url}",
    },
  });
  companyId = company.id;
  const client = await prisma.client.create({
    data: { ownerId, type: "COMPANY", name: "Client Test", companyName: "Client SA", phone: "+212661234567" },
  });
  clientId = client.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { ownerId: { in: [ownerId, otherOwnerId] } } });
  await prisma.client.deleteMany({ where: { ownerId: { in: [ownerId, otherOwnerId] } } });
  await prisma.company.deleteMany({ where: { ownerId: { in: [ownerId, otherOwnerId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherOwnerId] } } });
});

describe("whatsapp message helpers", () => {
  it("normalizes strict recipients", () => {
    expect(normalizeWhatsAppRecipient("0661234567")).toBe("212661234567");
    expect(normalizeWhatsAppRecipient("+212 661-234567")).toBe("212661234567");
    expect(() => normalizeWhatsAppRecipient("123")).toThrow(/recipient invalid/);
    expect(() => normalizeWhatsAppRecipient(null)).toThrow(/recipient invalid/);
  });

  it("validates and renders templates", () => {
    expect(() => validateWhatsAppTemplate("Hello {unknown}")).toThrow(/Unknown WhatsApp placeholder/);
    const rendered = renderWhatsAppTemplate("Hi {buyer}, {docType} {number} {url}", {
      docType: "FACTURE",
      number: "FAC-2026-0001",
      amountMinor: 12000,
      currency: "MAD",
      seller: "Atlas",
      buyer: "Client",
      url: "https://example.test/i/abc",
      dueDate: null,
    });
    expect(rendered).toContain("FAC-2026-0001");
    expect(rendered).toContain("https://example.test/i/abc");
  });

  it("locks only fresh SENDING rows", () => {
    expect(isWhatsAppSendLocked("SENDING", new Date(), new Date())).toBe(true);
    expect(isWhatsAppSendLocked("SENDING", new Date(Date.now() - 20 * 60 * 1000), new Date())).toBe(false);
    expect(isWhatsAppSendLocked("FAILED", new Date(), new Date())).toBe(false);
  });
});

describe("whatsapp invoice send", () => {
  it("sends the PDF once and returns alreadySent on repeat", async () => {
    const inv = await makeInvoice();
    const { gateway, calls } = fakeGateway();
    const first = await sendInvoiceViaWhatsApp(ownerId, inv.id, { gateway });
    expect(first.alreadySent).toBe(false);
    expect(first.to).toBe("212661234567");
    expect(first.messageId).toBe("wamid.test123");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.chatId).toBe("212661234567@c.us");
    expect(calls[0]!.caption).toContain("FAC");
    expect(calls[0]!.pdfLength).toBeGreaterThan(1000);
    expect(calls[0]!.filename).toMatch(/\.pdf$/);

    const second = await sendInvoiceViaWhatsApp(ownerId, inv.id, { gateway });
    expect(second.alreadySent).toBe(true);
    expect(calls).toHaveLength(1);

    const stored = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(stored.whatsappStatus).toBe("SENT");
    expect(stored.whatsappSentTo).toBe("212661234567");
    expect(stored.whatsappMessageId).toBe("wamid.test123");
    const events = await prisma.invoiceEvent.findMany({ where: { invoiceId: inv.id, type: "whatsapp_sent" } });
    expect(events).toHaveLength(1);
  });

  it("rejects invalid recipients without touching send status", async () => {
    const inv = await makeInvoice();
    const { gateway, calls } = fakeGateway();
    await expect(sendInvoiceViaWhatsApp(ownerId, inv.id, { to: "123", gateway })).rejects.toThrow(/recipient invalid/);
    expect(calls).toHaveLength(0);
    const stored = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(stored.whatsappStatus).toBe("NOT_SENT");
  });

  it("blocks a fresh SENDING row but retries a stale one", async () => {
    const locked = await makeInvoice({ whatsappStatus: "SENDING", whatsappLastAttemptAt: new Date() });
    const { gateway, calls } = fakeGateway();
    await expect(sendInvoiceViaWhatsApp(ownerId, locked.id, { gateway })).rejects.toThrow(/already in progress/);
    expect(calls).toHaveLength(0);

    const stale = await makeInvoice({
      whatsappStatus: "SENDING",
      whatsappLastAttemptAt: new Date(Date.now() - 20 * 60 * 1000),
    });
    const retry = await sendInvoiceViaWhatsApp(ownerId, stale.id, { gateway });
    expect(retry.alreadySent).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("marks provider failures FAILED and never marks them sent", async () => {
    const inv = await makeInvoice();
    const { gateway, calls } = fakeGateway({ fail: "provider exploded" });
    await expect(sendInvoiceViaWhatsApp(ownerId, inv.id, { gateway })).rejects.toThrow(/provider exploded/);
    expect(calls).toHaveLength(1);
    const stored = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(stored.whatsappStatus).toBe("FAILED");
    expect(stored.whatsappError).toContain("provider exploded");
    expect(stored.whatsappSentAt).toBeNull();
    const events = await prisma.invoiceEvent.findMany({ where: { invoiceId: inv.id, type: "whatsapp_failed" } });
    expect(events).toHaveLength(1);
  });

  it("enforces lifecycle, ownership, company opt-in, and registration", async () => {
    const draft = await makeInvoice({ status: "DRAFT", whatsappStatus: "NOT_SENT" });
    const { gateway } = fakeGateway();
    await expect(sendInvoiceViaWhatsApp(ownerId, draft.id, { gateway })).rejects.toThrow(/only ISSUED/);
    await expect(sendInvoiceViaWhatsApp(otherOwnerId, draft.id, { gateway })).rejects.toThrow(/not found/);

    await prisma.company.update({ where: { id: companyId }, data: { whatsappEnabled: false } });
    const disabled = await makeInvoice();
    await expect(sendInvoiceViaWhatsApp(ownerId, disabled.id, { gateway })).rejects.toThrow(/disabled/);
    await prisma.company.update({ where: { id: companyId }, data: { whatsappEnabled: true } });

    const unregistered = await makeInvoice();
    const unregisteredGateway = fakeGateway({ registered: false });
    await expect(
      sendInvoiceViaWhatsApp(ownerId, unregistered.id, { gateway: unregisteredGateway.gateway })
    ).rejects.toThrow(/not registered/);
    const stored = await prisma.invoice.findUniqueOrThrow({ where: { id: unregistered.id } });
    expect(stored.whatsappStatus).toBe("FAILED");
  });
});
