import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/safe";
import { minorToPlain, toCsv } from "@/lib/csv";
import { EXPORT_LIMIT } from "@/lib/constants";

/** Build CSV for the accountant: fixed columns, fully dynamic values per invoice. */
export async function buildInvoicesCsv(ownerId: string, opts?: { from?: Date; to?: Date }): Promise<string> {
  const where = {
    ownerId,
    ...(opts?.from || opts?.to
      ? { issueDate: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
      : {}),
  };
  const rows = await prisma.invoice.findMany({ where, orderBy: { issueDate: "asc" }, take: EXPORT_LIMIT });

  const body = rows.map((inv) => {
    const buyer = safeJsonParse<{ companyName?: string; name?: string }>(inv.buyerSnapshot, {});
    return [
      inv.invoiceNumber ?? inv.id.slice(0, 8),
      inv.docType,
      inv.status,
      inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : "",
      inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "",
      buyer.companyName ?? buyer.name ?? "",
      inv.currency,
      minorToPlain(inv.subtotalHT),
      minorToPlain(inv.totalTVA),
      minorToPlain(inv.totalTTC),
      inv.notes ?? "",
    ];
  });

  return toCsv(body, ["number", "docType", "status", "issueDate", "dueDate", "client", "currency", "subtotalHT", "totalTVA", "totalTTC", "notes"]);
}
