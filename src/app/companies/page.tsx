import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { listCompanies } from "@/server/companies-clients";
import CompanyForm from "@/components/CompanyForm";

export default async function CompaniesPage({ searchParams }: { searchParams: { edit?: string; new?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const companies = await listCompanies();
  const editing = searchParams.edit ? companies.find((c) => c.id === searchParams.edit) : null;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>Sociétés ({companies.length})</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/companies?new=1">+ Nouvelle société</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {companies.map((c) => (
          <div key={c.id} style={{ background: "#fff", padding: 14, borderRadius: 8 }}>
            <strong>{c.legalName}</strong>
            <div style={{ fontSize: 13, opacity: 0.7 }}>{c.city} · ICE {c.ice || "—"} · {c.defaultCurrency}</div>
            <div style={{ marginTop: 8 }}><Link href={`/companies?edit=${c.id}`}>Modifier</Link></div>
          </div>
        ))}
      </div>
      {(searchParams.new || editing) && (
        <CompanyForm initial={editing ? { ...editing, capitalSocial: (editing as { capitalSocial?: number }).capitalSocial ?? undefined } as never : undefined} />
      )}
    </div>
  );
}
