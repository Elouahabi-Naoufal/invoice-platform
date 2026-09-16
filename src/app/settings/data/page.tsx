import Link from "next/link";

export default function DataSettingsPage() {
  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <h2 className="section-title mb-1">Exports</h2>
        <p className="mb-3 text-[13px] text-ink-500 dark:text-stone-400">
          Download your data at any time. Invoices as CSV for your accountant, UBL per invoice, and reports.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/exports/csv" className="btn-outline btn-sm">Invoices CSV</a>
          <a href="/api/exports/reports" className="btn-outline btn-sm">Reports CSV</a>
          <Link href="/exports" className="btn-outline btn-sm">Exports page</Link>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="section-title mb-1">Archiving</h2>
        <p className="text-[13px] text-ink-500 dark:text-stone-400">
          Invoices must be kept 10 years (art. 211 CGI). Issued and cancelled invoices are immutable and keep
          their numbers. Back up the SQLite database file regularly — there is no cloud sync.
        </p>
      </div>
      <div className="card p-5">
        <h2 className="section-title mb-1">Numbering</h2>
        <p className="text-[13px] text-ink-500 dark:text-stone-400">
          Numbers are allocated per company, per prefix, per year at finalization — never reused, never edited.
          Credit notes use their own series (default prefix <code className="rounded-sm bg-ink-100 px-1 text-[12px] dark:bg-white/10">AV</code>).
        </p>
      </div>
    </div>
  );
}
