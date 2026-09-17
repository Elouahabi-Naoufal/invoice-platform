"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/components/nav";
import { cn } from "@/components/ui";
import NewInvoiceMenu from "@/components/NewInvoiceMenu";

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-ink-200 bg-white lg:flex dark:border-white/10 dark:bg-[#101828]">
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/invora-mark.png" alt="Invora" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-ink-950 dark:text-white">Invora</span>
        </Link>
      </div>

      <nav className="scroll-thin flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3.5 pb-3">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{g.label}</p>
            <div className="flex flex-col gap-0.5">
              {g.items.map((n) => {
                const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
                const Icon = n.icon;
                return (
                  <Link key={n.href} href={n.href} className={cn("navlink", active && "navlink-active")}>
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                    {n.label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-100 px-3.5 py-3 dark:border-white/10">
        <NewInvoiceMenu up />
        <div className="mt-3 rounded border border-brand-100 bg-brand-50/70 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
          <p className="text-[12px] font-semibold text-brand-700 dark:text-brand-400">Art. 211 CGI</p>
          <p className="meta mt-0.5">Invoices are kept 10 years and stay immutable once finalized.</p>
        </div>
      </div>
    </aside>
  );
}
