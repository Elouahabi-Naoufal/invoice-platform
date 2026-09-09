import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { listInvoices } from "@/server/invoice-ops";

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const rows = await listInvoices(searchParams.status ? { status: searchParams.status } : undefined);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1>Factures</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/invoices">Toutes</Link><Link href="/invoices?status=DRAFT">Brouillons</Link>
        <Link href="/invoices?status=ISSUED">Émises</Link><Link href="/invoices?status=CANCELLED">Annulées</Link>
        <Link href="/invoices/new" style={{ marginLeft: "auto" }}>+ Nouvelle facture</Link>
      </div>
      <table style={{ background: "#fff", borderCollapse: "collapse" }} cellPadding={8}>
        <thead><tr><th align="left">N°</th><th>Type</th><th>Client</th><th>Total</th><th>Payé/Reste</th><th>Statut</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td><Link href={`/invoices/${r.id}`}>{r.invoiceNumber ?? <em>brouillon</em>}</Link></td>
              <td>{r.docType}</td>
              <td>{(r.client as { companyName?: string; name?: string } | null)?.companyName ?? (r.client as { name?: string } | null)?.name ?? "—"}</td>
              <td>{(r.totalTTC / 100).toFixed(2)} {r.currency}</td>
              <td>{(r.paidAmount / 100).toFixed(2)} / {(r.remaining / 100).toFixed(2)}</td>
              <td><strong>{r.display}</strong> <span style={{ opacity: 0.6 }}>({r.status})</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
