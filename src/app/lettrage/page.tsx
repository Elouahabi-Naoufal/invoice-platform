import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { safeFindMany } from "@/lib/safe";
import { LettrageForm, RemoveBtn } from "@/components/LettrageForm";
import { formatMoney } from "@/domain/invoice";

export default async function LettragePage() {
  try { await requireUser(); } catch { redirect("/login"); }
  const u = await prisma.user.findFirst({ where: { email: (await requireUser()).email } as never });
  if (!u) redirect("/login");
  const avoirs = await safeFindMany(() => prisma.invoice.findMany({ where: { ownerId: u.id, docType: "AVOIR" }, select: { id: true, invoiceNumber: true, totalTTC: true, currency: true }, orderBy: { createdAt: "desc" }, take: 100 }), []);
  const invoices = await safeFindMany(() => prisma.invoice.findMany({ where: { ownerId: u.id, status: "ISSUED" }, select: { id: true, invoiceNumber: true }, orderBy: { createdAt: "desc" }, take: 100 }), []);
  const rows = await safeFindMany(() => prisma.avoirInvoice.findMany({ where: { ownerId: u.id }, include: { avoir: { select: { invoiceNumber: true } }, invoice: { select: { invoiceNumber: true } } }, orderBy: { createdAt: "desc" }, take: 100 }), []);
  return (
    <div>
      <div className="mb-5"><h1 className="page-title">Lettrage avoirs</h1><p className="meta mt-1">Reconcile credit notes (avoirs) against invoices — pick both documents and the imputed amount yourself.</p></div>
      <div className="card mb-4 p-4"><h2 className="font-semibold mb-2">New lettrage</h2><LettrageForm avoirs={avoirs as never} invoices={invoices as never} /></div>
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Reconciliations ({rows.length})</span></div>
        {rows.length === 0 ? <p className="p-4 text-sm text-ink-500">No lettrage yet</p> : (
          <table className="tbl">
            <thead><tr><th>Avoir</th><th>Invoice</th><th className="num">Amount</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}><td className="font-medium">{r.avoir.invoiceNumber}</td><td className="font-medium">{r.invoice.invoiceNumber}</td><td className="num tabular-nums">{formatMoney(r.amountMinor, "MAD")}</td><td className="text-right"><RemoveBtn id={r.id} /></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
