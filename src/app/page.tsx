import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { listInvoices } from "@/server/invoice-ops";

export default async function Dashboard() {
  try { await requireUser(); } catch { redirect("/login"); }
  const rows = await listInvoices();
  const byCur: Record<string, { issued: number; paid: number; outstanding: number; overdue: number; count: number }> = {};
  const bump = (c: string) => (byCur[c] ??= { issued: 0, paid: 0, outstanding: 0, overdue: 0, count: 0 });
  const month = new Date().toISOString().slice(0, 7);
  let issuedMonth = 0;
  const paidMonthByCur: Record<string, number> = {};
  for (const r of rows) {
    const b = bump(r.currency);
    if (r.status === "CANCELLED") continue;
    if (r.status === "ISSUED") {
      b.issued += r.totalTTC; b.paid += r.paidAmount; b.outstanding += r.remaining; b.count += 1;
      if (r.display === "OVERDUE") b.overdue += r.remaining;
      if (r.finalizedAt?.toISOString().slice(0, 7) === month) issuedMonth += 1;
      for (const p of r.payments) if (new Date(p.paymentDate).toISOString().slice(0, 7) === month) paidMonthByCur[r.currency] = (paidMonthByCur[r.currency] ?? 0) + p.amountMinor;
    }
  }
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>Tableau de bord (réel — jamais de devises mélangées)</h1>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>Factures émises ce mois : <strong>{issuedMonth}</strong></div>
        {Object.entries(paidMonthByCur).map(([cur, v]) => (
          <div key={cur} style={{ background: "#fff", padding: 12, borderRadius: 8 }}>Encaissé ce mois ({cur}) : <strong>{(v / 100).toFixed(2)}</strong></div>
        ))}
      </div>
      {Object.entries(byCur).map(([cur, b]) => (
        <div key={cur} style={{ background: "#fff", padding: 14, borderRadius: 8 }}>
          <h3>{cur}</h3>
          <div>Émis : {(b.issued / 100).toFixed(2)} · Payé : {(b.paid / 100).toFixed(2)} · En attente : {(b.outstanding / 100).toFixed(2)} · En retard : {(b.overdue / 100).toFixed(2)}</div>
        </div>
      ))}
      {Object.keys(byCur).length === 0 && <p>Aucune facture. <Link href="/invoices/new">Créer la première</Link>.</p>}
      <h2>Récentes</h2>
      {rows.slice(0, 10).map((r) => (
        <div key={r.id}><Link href={`/invoices/${r.id}`}>{r.invoiceNumber ?? "brouillon"}</Link> · {(r.totalTTC / 100).toFixed(2)} {r.currency} · {r.display}</div>
      ))}
    </div>
  );
}
