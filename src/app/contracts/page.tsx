import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { contractSummaries } from "@/server/contracts";
import { listClients } from "@/server/companies-clients";
import { ContractForm, ContractDelete } from "@/components/ContractForm";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";
import { toPlain } from "@/lib/safe";
import { Handshake } from "lucide-react";

export default async function ContractsPage() {
  try { await requireActor(); } catch { redirect("/login"); }
  const [summaries, clients] = await Promise.all([contractSummaries(), listClients()]);
  return (
    <div>
      <PageHeader title="Contracts" description="Agreements with clients and how much of each has been invoiced." />
      <div className="card mb-4 p-5">
        <h2 className="section-title mb-3">New contract</h2>
        <ContractForm clients={toPlain(clients)} />
      </div>
      {summaries.length === 0 ? (
        <EmptyState title="No contracts" body="Add a contract to track the agreed value against what you have invoiced." icon={<Handshake size={22} />} />
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Contract</th><th>Client</th><th className="num">Value</th><th className="num">Invoiced</th><th>Progress</th><th></th></tr></thead>
            <tbody>
              {summaries.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.title}</td>
                  <td className="text-ink-500">{c.client}</td>
                  <td className="num tabular-nums">{formatMoney(c.valueMinor, c.currency)}</td>
                  <td className="num tabular-nums">{formatMoney(c.invoicedMinor, c.currency)}</td>
                  <td className="w-[180px]">
                    <div className="h-1.5 w-full rounded-full bg-ink-100 dark:bg-white/10">
                      <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${c.percent}%` }} />
                    </div>
                    <span className="meta">{c.percent}%</span>
                  </td>
                  <td className="text-right"><ContractDelete id={c.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
