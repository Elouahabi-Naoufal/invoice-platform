import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { listCompanies, listClients } from "@/server/companies-clients";
import InvoiceBuilder, { DraftInit } from "@/components/InvoiceBuilder";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage({ searchParams }: { searchParams: { linked?: string; edit?: string } }) {
  const user = await (async () => { try { return await requireUser(); } catch { redirect("/login"); } })();
  const companies = await listCompanies();
  if (companies.length === 0) redirect("/companies?new=1");
  const clients = await listClients();

  let linked: { id: string; number: string | null } | null = null;
  if (searchParams.linked) {
    const orig = await prisma.invoice.findFirst({ where: { id: searchParams.linked, ownerId: user!.id } });
    if (orig) linked = { id: orig.id, number: orig.invoiceNumber };
  }

  let draft: DraftInit | null = null;
  if (searchParams.edit) {
    const d = await prisma.invoice.findFirst({
      where: { id: searchParams.edit, ownerId: user!.id, status: "DRAFT" },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    if (!d) redirect("/invoices");
    draft = {
      id: d.id, docType: d.docType, currency: d.currency,
      issueDate: d.issueDate.toISOString().slice(0, 10),
      dueDate: d.dueDate ? d.dueDate.toISOString().slice(0, 10) : null,
      paymentTerms: d.paymentTerms, paymentMode: d.paymentMode, poNumber: d.poNumber, notes: d.notes,
      invDiscountBps: d.invDiscountBps, companyId: d.companyId, clientId: d.clientId,
      correctionReason: d.correctionReason, linkedInvoiceId: d.linkedInvoiceId,
      lines: d.lines.map((l) => ({
        description: l.description, quantityMilli: l.quantityMilli, unit: l.unit,
        unitPriceMinor: l.unitPriceMinor, discountBps: l.discountBps,
        taxRateBps: l.taxRateBps, taxExempt: l.taxExempt,
      })),
    };
  }

  return <InvoiceBuilder companies={companies as never} initialClients={clients as never} linked={linked} draft={draft} />;
}
