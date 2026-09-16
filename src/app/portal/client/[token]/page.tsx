import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatMoney } from "@/domain/invoice";
import Link from "next/link";

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const client = await prisma.client.findFirst({ where: { portalToken: params.token } });
  if (!client) notFound();
  const invoices = await prisma.invoice.findMany({
    where: { clientId: client.id, status: "ISSUED", portalShared: true },
    orderBy: { issueDate: "desc" },
    take: 100,
  });
  if (invoices.length === 0) notFound();
  const owner = await prisma.user.findUnique({ where: { id: client.ownerId }, select: { displayName: true } });

  return (
    <div className="mx-auto max-w-[900px] p-6">
      <h1 className="page-title">{owner?.displayName ?? "Client"} — portal</h1>
      <p className="meta mt-1">Invoices shared with {client.companyName || client.name}. Click to view or download the PDF.</p>
      <div className="card mt-4 overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Number</th><th>Date</th><th className="num">Total</th><th></th></tr></thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="font-medium">{inv.invoiceNumber}</td>
                <td className="text-ink-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                <td className="num tabular-nums">{formatMoney(inv.totalTTC, inv.currency)}</td>
                <td className="text-right">
                  {inv.publicToken ? (
                    <Link href={`/i/${inv.publicToken}`} className="text-sm text-brand-600 hover:underline">View</Link>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta mt-4">This private link only shows invoices shared with you.</p>
    </div>
  );
}
