import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listClients } from "@/server/companies-clients";
import ClientForm from "@/components/ClientForm";
import { EmptyState } from "@/components/ui";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string; new?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const clients = await listClients(searchParams.q);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="page-title">Clients</h1>
        <Link href="/clients?new=1" className="btn-accent"><Plus size={15} /> New client</Link>
      </div>
      <form className="card mb-3 flex gap-2 p-3" action="/clients" method="get">
        <input name="q" placeholder="Search name, company, email…" defaultValue={searchParams.q ?? ""} className="input" />
        <button className="btn-outline">Search</button>
      </form>
      {searchParams.new !== undefined && (
        <div className="card mb-3 p-5"><ClientForm /></div>
      )}
      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Add the people and companies you bill. B2B clients need an ICE when you finalize."
          action={<Link href="/clients?new=1" className="btn-accent"><Plus size={15} /> Add client</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Client</th><th>Type</th><th>ICE</th><th>Contact</th><th>City</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.companyName || c.name}{c.companyName && <span className="meta block">{c.name}</span>}</td>
                  <td className="text-ink-500 dark:text-stone-400">{c.type === "COMPANY" ? "B2B" : "B2C"}</td>
                  <td className="tabular-nums text-ink-500 dark:text-stone-400">{c.ice || "—"}</td>
                  <td className="text-ink-500 dark:text-stone-400">{c.email || c.phone || "—"}</td>
                  <td className="text-ink-500 dark:text-stone-400">{c.city || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
