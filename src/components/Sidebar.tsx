"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_GROUPS } from "@/components/nav";
import { cn } from "@/components/ui";

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto border-r border-ink-200 bg-white px-3.5 py-4 lg:flex dark:border-white/10 dark:bg-[#101828]">
      <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/invora-mark.png" alt="Invora" className="h-8 w-8" />
        <span className="text-lg font-semibold tracking-tight text-ink-950 dark:text-white">Invora</span>
      </Link>

      <nav className="flex flex-col gap-5">
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
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Link href="/invoices/new" className="btn-accent mt-6 w-full">
        <Plus size={16} /> New invoice
      </Link>

      <div className="mt-auto pt-4">
        <div className="rounded border border-brand-100 bg-brand-50/70 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
          <p className="text-[12px] font-semibold text-brand-700 dark:text-brand-400">Art. 211 CGI</p>
          <p className="meta mt-0.5">Invoices are kept 10 years and stay immutable once finalized.</p>
        </div>
      </div>
    </aside>
  );
}
