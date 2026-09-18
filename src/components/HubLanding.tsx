import Link from "next/link";

export default function HubLanding() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
      <div className="w-full max-w-[520px]">
        <div className="card p-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2.5">
            <img src="/invora-mark.png" alt="Invora" className="h-9 w-9" />
            <span className="text-xl font-semibold tracking-tight">Invora</span>
          </div>
          <h1 className="page-title mb-2">Invoicing for Moroccan businesses</h1>
          <p className="meta mb-6">Fully self-hosted. Each business gets its own isolated deployment with dedicated database.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/register" className="btn-accent">Get started</Link>
            <Link href="/admin-login" className="btn-outline">Admin</Link>
          </div>
          <p className="meta mt-6 text-[12px] text-ink-400">
            <Link href="/home" className="hover:text-ink-700">Home</Link> · <Link href="/privacy" className="hover:text-ink-700">Privacy</Link> · <Link href="/terms" className="hover:text-ink-700">Terms</Link>
          </p>
        </div>
      </div>
    </div>
  );
}