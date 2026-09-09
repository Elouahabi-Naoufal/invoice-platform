import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { listClients } from "@/server/companies-clients";
import ClientForm from "@/components/ClientForm";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string; new?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const clients = await listClients(searchParams.q);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>Clients ({clients.length})</h1>
      <form style={{ display: "flex", gap: 8 }}>
        <input name="q" placeholder="Rechercher…" defaultValue={searchParams.q ?? ""} style={{ padding: 8 }} />
        <button>OK</button>
        <Link href="/clients?new=1" style={{ marginLeft: 8 }}>+ Nouveau</Link>
      </form>
      {searchParams.new && <ClientForm />}
      <div style={{ display: "grid", gap: 8 }}>
        {clients.map((c) => (
          <div key={c.id} style={{ background: "#fff", padding: 12, borderRadius: 8, display: "flex", gap: 12 }}>
            <strong>{c.companyName || c.name}</strong>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{c.type} · ICE {c.ice || "—"} · {c.email || ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
