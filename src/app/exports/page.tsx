import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";

export default async function ExportsPage() {
  try { await requireUser(); } catch { redirect("/login"); }
  return (
    <div>
      <div className="mb-5"><h1 className="page-title">Exports</h1><p className="meta mt-1">Comptable CSV and UBL e-invoice — choose your date range and download.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">CSV — comptable</h2>
          <p className="meta mt-1">Semicolon-separated; numbers in minor units → 2 decimals. Filter by issue date.</p>
          <form action="/api/exports/csv" method="get" className="mt-3 flex flex-wrap gap-2 items-end">
            <div><label className="label">From</label><input name="from" type="date" className="input" /></div>
            <div><label className="label">To</label><input name="to" type="date" className="input" /></div>
            <button className="btn-primary btn-sm">Download CSV</button>
          </form>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">UBL e-invoice</h2>
          <p className="meta mt-1">Per-invoice UBL 2.1 XML — use the “UBL” button on any invoice detail page.</p>
          <p className="mt-3 text-sm text-ink-500">Go to <a href="/invoices" className="text-brand-600 hover:underline">Invoices</a> → open an issued invoice → Download UBL.</p>
        </div>
      </div>
    </div>
  );
}
