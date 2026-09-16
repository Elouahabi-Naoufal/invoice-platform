import { prisma } from "@/lib/prisma";

function esc(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build CSV for comptable: columns are fixed but values are fully dynamic per invoice. */
export async function buildInvoicesCsv(ownerId: string, opts?: { from?: Date; to?: Date }): Promise<string> {
  const where: Record<string, unknown> = { ownerId };
  if (opts?.from || opts?.to) {
    where.issueDate = {
      ...(opts.from ? { gte: opts.from } : {}),
      ...(opts.to ? { lte: opts.to } : {}),
    };
  }
  const rows = await prisma.invoice.findMany({ where: where as never, orderBy: { issueDate: "asc" }, take: 1000 });
  const header = ["number", "docType", "status", "issueDate", "dueDate", "client", "currency", "subtotalHT", "totalTVA", "totalTTC", "notes"].join(";");
  const lines = rows.map((inv) =>
    [
      inv.invoiceNumber ?? inv.id.slice(0, 8),
      inv.docType,
      inv.status,
      inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : "",
      inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "",
      (() => { try { const b = inv.buyerSnapshot ? JSON.parse(inv.buyerSnapshot as string) : null; return b?.companyName ?? b?.name ?? ""; } catch { return ""; } })(),
      inv.currency,
      (inv.subtotalHT / 100).toFixed(2),
      (inv.totalTVA / 100).toFixed(2),
      (inv.totalTTC / 100).toFixed(2),
      inv.notes ?? "",
    ].map(esc).join(";")
  );
  return [header, ...lines].join("\n");
}
