import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PublicInvoice({ params }: { params: { token: string } }) {
  const inv = await prisma.invoice.findFirst({
    where: { publicToken: params.token, status: "ISSUED" },
    include: { payments: true },
  });
  if (!inv) notFound();
  const paid = inv.payments.reduce((a, p) => a + p.amountMinor, 0);
  const remaining = inv.totalTTC - paid;
  await prisma.invoiceEvent.create({ data: { invoiceId: inv.id, type: "viewed", metadata: "public-link" } });
  if (!inv.viewedAt) await prisma.invoice.update({ where: { id: inv.id }, data: { viewedAt: new Date() } });
  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8 }}>
      <h1>Facture {inv.invoiceNumber}</h1>
      <p>Total TTC : {(inv.totalTTC / 100).toFixed(2)} {inv.currency} · Payé : {(paid / 100).toFixed(2)} · Reste : {(remaining / 100).toFixed(2)}</p>
      <p><a href={`/api/invoices/${inv.id}/pdf`}>Télécharger le PDF</a></p>
      <p style={{ color: "#666" }}>Lien public — ne contient que les données visibles sur la facture.</p>
    </div>
  );
}
