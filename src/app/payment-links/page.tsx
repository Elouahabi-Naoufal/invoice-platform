import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { safeFindMany } from "@/lib/safe";
import { PaymentLinkForm } from "@/components/PaymentLinkForm";

export default async function PaymentLinksPage() {
  try { await requireUser(); } catch { redirect("/login"); }
  const u = await prisma.user.findFirst({ where: { email: (await requireUser()).email } as never });
  if (!u) redirect("/login");
  const invoices = await safeFindMany(() => prisma.invoice.findMany({ where: { ownerId: u.id, status: "ISSUED" }, select: { id: true, invoiceNumber: true, totalTTC: true, currency: true }, orderBy: { createdAt: "desc" }, take: 100 }), []);
  const links = await safeFindMany(() => prisma.paymentLink.findMany({ where: { ownerId: u.id }, include: { invoice: { select: { invoiceNumber: true } } }, orderBy: { createdAt: "desc" }, take: 100 }), []);
  return (
    <div>
      <div className="mb-5"><h1 className="page-title">Payment links</h1><p className="meta mt-1">Create a shareable payment token per invoice — amount is yours to set (defaults to TTC).</p></div>
      <div className="card mb-4 p-4"><h2 className="font-semibold mb-2">Create payment link</h2><PaymentLinkForm invoices={invoices as never} /></div>
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Links ({links.length})</span></div>
        {links.length === 0 ? <p className="p-4 text-sm text-ink-500">No links yet</p> : (
          <table className="tbl">
            <thead><tr><th>Token</th><th>Invoice</th><th>Amount</th><th>Expires</th><th>Status</th></tr></thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}><td className="font-mono text-xs">{l.token}</td><td className="font-medium">{l.invoice.invoiceNumber}</td><td className="tabular-nums">{l.amountMinor != null ? `${(l.amountMinor / 100).toFixed(2)}` : "—"}</td><td className="tabular-nums text-ink-500">{l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : "—"}</td><td>{l.usedAt ? <span className="badge">Used</span> : l.expiresAt && new Date(l.expiresAt) < new Date() ? <span className="badge badge-amber">Expired</span> : <span className="badge badge-emerald">Active</span>}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
