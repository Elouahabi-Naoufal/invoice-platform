import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { listCompanies, listClients } from "@/server/companies-clients";
import InvoiceBuilder from "@/components/InvoiceBuilder";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage({ searchParams }: { searchParams: { linked?: string; docType?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const companies = await listCompanies();
  if (companies.length === 0) redirect("/companies?new=1");
  const clients = await listClients();
  let linked: { id: string; number: string | null } | null = null;
  if (searchParams.linked) {
    const u = await requireUser();
    const orig = await prisma.invoice.findFirst({ where: { id: searchParams.linked, ownerId: u.id } });
    if (orig) linked = { id: orig.id, number: orig.invoiceNumber };
  }
  return <InvoiceBuilder companies={companies as never} initialClients={clients as never} linked={linked} />;
}
