import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { safeFindMany } from "@/lib/safe";
import { PortalToggle } from "@/components/PortalToggle";
import { ClientPortalActions } from "@/components/ClientPortalActions";
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
  let ownerId = "";
  try {
    ownerId = (await requireActor()).ownerId;
  } catch {
    redirect("/login");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const clients = await safeFindMany(() => prisma.client.findMany({ where: { ownerId }, orderBy: { name: "asc" }, take: 200 }), []);
  const invoices = await safeFindMany(() => prisma.invoice.findMany({ where: { ownerId, status: "ISSUED" }, orderBy: { createdAt: "desc" }, take: 100 }), []);
  const shared = invoices.filter((i) => i.portalShared);

  return (
    <div>
      <div className="mb-5">
        <h1 className="page-title">Client portal</h1>
        <p className="meta mt-1">Each client gets a private link that only shows the invoices you choose to share. Generate a link per client below.</p>
      </div>

      <div className="card mb-4 overflow-hidden">
        <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Client portal links</span></div>
        {clients.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">No clients yet.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Client</th><th>Email</th><th className="text-right">Portal link</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.companyName || c.name}</td>
                  <td className="text-ink-500">{c.email || "—"}</td>
                  <td className="text-right"><ClientPortalActions clientId={c.id} token={c.portalToken} appUrl={appUrl} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Issued invoices ({shared.length} shared)</span></div>
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
