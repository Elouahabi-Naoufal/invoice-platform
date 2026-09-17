"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus } from "lucide-react";
import { NAV_GROUPS } from "@/components/nav";
import { cn } from "@/components/ui";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost btn-sm lg:hidden" aria-label="Open menu">
        <Menu size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[272px] flex-col overflow-y-auto border-r border-ink-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#101828]">
            <div className="mb-6 flex items-center justify-between px-2">
              <Link href="/" className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/invora-mark.png" alt="Invora" className="h-7 w-7" />
                <span className="text-lg font-semibold tracking-tight">Invora</span>
              </Link>
              <button onClick={() => setOpen(false)} className="btn-ghost btn-sm" aria-label="Close menu"><X size={17} /></button>
            </div>
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
            <Link href="/invoices/new" className="btn-accent mt-5 w-full"><Plus size={16} /> New invoice</Link>
          </aside>
        </div>
      )}
    </>
  );
}
