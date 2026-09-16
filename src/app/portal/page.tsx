import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { safeFindMany } from "@/lib/safe";
import { PortalToggle } from "@/components/PortalToggle";
import { formatMoney } from "@/domain/invoice";
import Link from "next/link";

function buyerLabel(snapshot: string | null | undefined): string {
  if (!snapshot) return "—";
  try {
    const b = JSON.parse(snapshot) as { companyName?: string; name?: string };
    return b?.companyName ?? b?.name ?? "—";
  } catch {
    return "—";
  }
}

export default async function PortalPage() {
  try { await requireUser(); } catch { redirect("/login"); }
  const u = await prisma.user.findFirst({ where: { email: (await requireUser()).email } as never });
  if (!u) redirect("/login");
  const invoices = await safeFindMany(() => prisma.invoice.findMany({ where: { ownerId: u.id, status: "ISSUED" }, orderBy: { createdAt: "desc" }, take: 100 }), []);
  const shared = invoices.filter((i) => i.portalShared);
  return (
    <div>
      <div className="mb-5"><h1 className="page-title">Client portal</h1><p className="meta mt-1">Choose which issued invoices clients can see via their portal link. Toggle per invoice.</p></div>
      <div className="card mb-4 p-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-ink-600">Public portal URL (share with clients):</span>
        <code className="rounded bg-ink-100 px-2 py-1 text-xs dark:bg-white/10">{process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal/{u.id}</code>
        <span className="text-xs text-ink-500">{shared.length} shared</span>
      </div>
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Issued invoices</span></div>
        {invoices.length === 0 ? <p className="p-4 text-sm text-ink-500">No issued invoices yet</p> : (
          <table className="tbl">
            <thead><tr><th>Number</th><th>Client</th><th className="num">Total</th><th>Portal</th><th></th></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-medium"><Link href={`/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link></td>
                  <td className="text-ink-500">{buyerLabel(inv.buyerSnapshot)}</td>
                  <td className="num tabular-nums">{formatMoney(inv.totalTTC, inv.currency)}</td>
                  <td>{inv.portalShared ? <span className="badge badge-emerald">Shared</span> : <span className="badge">Private</span>}</td>
                  <td className="text-right"><PortalToggle id={inv.id} shared={!!inv.portalShared} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
