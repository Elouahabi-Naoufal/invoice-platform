import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listCompanies } from "@/server/companies-clients";
import CompanyForm from "@/components/CompanyForm";
import { EmptyState } from "@/components/ui";

export default async function CompaniesPage({ searchParams }: { searchParams: { edit?: string; new?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const companies = await listCompanies();
  const editing = searchParams.edit ? companies.find((c) => c.id === searchParams.edit) : null;
  const showForm = searchParams.new !== undefined || !!editing;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="page-title">Companies</h1>
        <Link href="/companies?new=1" className="btn-accent"><Plus size={15} /> New company</Link>
      </div>
      {companies.length === 0 && !showForm ? (
        <EmptyState
          title="No companies yet"
          body="Add your business identity, Moroccan tax identifiers and bank details. You can manage several companies."
          action={<Link href="/companies?new=1" className="btn-accent"><Plus size={15} /> Add company</Link>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          {companies.map((c) => (
            <div key={c.id} className="card flex items-start gap-3.5 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-950 text-base font-semibold text-white">
                {c.legalName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold tracking-tight">{c.legalName}</div>
                <div className="meta">{c.city ?? ""}{c.city ? " · " : ""}{c.defaultCurrency}</div>
                <div className="meta tabular-nums">ICE {c.ice || "—"}</div>
              </div>
              <Link href={`/companies?edit=${c.id}`} className="btn-ghost btn-sm"><Pencil size={13} /> Edit</Link>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="mt-5">
          <CompanyForm initial={editing ? { ...editing } as never : undefined} />
        </div>
      )}
    </div>
  );
}
