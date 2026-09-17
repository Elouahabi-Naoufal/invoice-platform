import { redirect } from "next/navigation";
import { requireActor, getActiveCompanyId } from "@/server/auth";
import { listCompanies, listClients } from "@/server/companies-clients";
import { listProducts } from "@/server/products";
import InvoiceBuilder, { DraftInit } from "@/components/InvoiceBuilder";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage({ searchParams }: { searchParams: { linked?: string; edit?: string; type?: string; template?: string } }) {
  let ownerId = "";
  try {
    ownerId = (await requireActor()).ownerId;
  } catch {
    redirect("/login");
  }
  const companies = await listCompanies();
  if (companies.length === 0) redirect("/companies?new=1");
  const clients = await listClients();
  const catalog = await listProducts().catch(() => []);

  let linked: { id: string; number: string | null } | null = null;
  if (searchParams.linked) {
    const orig = await prisma.invoice.findFirst({ where: { id: searchParams.linked, ownerId } });
    if (orig) linked = { id: orig.id, number: orig.invoiceNumber };
  }

  let draft: DraftInit | null = null;
  if (searchParams.edit) {
    const d = await prisma.invoice.findFirst({
      where: { id: searchParams.edit, ownerId, status: "DRAFT" },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    if (!d) redirect("/invoices");
    draft = {
      id: d.id, docType: d.docType, currency: d.currency,
      issueDate: d.issueDate.toISOString().slice(0, 10),
      dueDate: d.dueDate ? d.dueDate.toISOString().slice(0, 10) : null,
      validUntil: d.validUntil ? d.validUntil.toISOString().slice(0, 10) : null,
      paymentTerms: d.paymentTerms, paymentMode: d.paymentMode, poNumber: d.poNumber, notes: d.notes,
      invDiscountBps: d.invDiscountBps, invDiscountFixedMinor: d.invDiscountFixedMinor, companyId: d.companyId, clientId: d.clientId,
      correctionReason: d.correctionReason, linkedInvoiceId: d.linkedInvoiceId,
      lines: d.lines.map((l) => ({
        description: l.description, quantityMilli: l.quantityMilli, unit: l.unit,
        unitPriceMinor: l.unitPriceMinor, discountBps: l.discountBps,
        taxRateBps: l.taxRateBps, taxExempt: l.taxExempt,
      })),
    };
  }

  const linkedType = searchParams.type === "RECTIFICATIVE" ? "RECTIFICATIVE" : undefined;
  const activeCompanyId = await getActiveCompanyId();

  // "From a template": prefill the builder with the template's fields and lines.
  let prefill = draft;
  if (!draft && searchParams.template) {
    const t = await prisma.recurringTemplate.findFirst({ where: { id: searchParams.template, ownerId } });
    if (t) {
      prefill = {
        docType: t.docType,
        currency: t.currency,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: null,
        validUntil: null,
        paymentTerms: t.paymentTerms,
        paymentMode: null,
        poNumber: null,
        notes: null,
        invDiscountBps: 0,
        invDiscountFixedMinor: 0,
        companyId: t.companyId,
        clientId: t.clientId,
        correctionReason: null,
        linkedInvoiceId: null,
        lines: t.lines ? JSON.parse(t.lines) : [],
      };
    }
  }

  return <InvoiceBuilder companies={companies as never} initialClients={clients as never} linked={linked} linkedType={linkedType} draft={prefill} catalog={catalog as never} defaultCompanyId={activeCompanyId} />;
}
