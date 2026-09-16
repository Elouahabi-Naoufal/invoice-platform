import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md gap-4 py-20 text-center">
      <h1 className="page-title">Page not found</h1>
      <p className="text-[13px] text-ink-500 dark:text-stone-400">
        The page or document you requested does not exist or is no longer available.
      </p>
      <div className="flex justify-center gap-2">
        <Link href="/" className="btn-primary">Back to dashboard</Link>
        <Link href="/invoices" className="btn-outline">Invoices</Link>
      </div>
    </div>
  );
}
