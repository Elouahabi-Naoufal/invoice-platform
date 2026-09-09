"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, Building2, Settings, Plus } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/invoices", label: "Invoices", icon: FileText, exact: false },
  { href: "/clients", label: "Clients", icon: Users, exact: false },
  { href: "/companies", label: "Companies", icon: Building2, exact: false },
  { href: "/settings", label: "Settings", icon: Settings, exact: false },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex w-[216px] shrink-0 flex-col border-r border-ink-200 dark:border-white/10 bg-white dark:bg-[#1C1917] px-3 py-5 max-md:hidden">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-950 text-[13px] font-bold text-white">F</span>
        <span className="text-[14px] font-semibold tracking-tight">Facturo</span>
      </Link>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => {
          const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} className={`navlink ${active ? "navlink-active" : ""}`}>
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/invoices/new" className="btn-accent mt-4">
        <Plus size={15} /> New invoice
      </Link>
      <div className="mt-auto px-2 pt-4">
        <p className="meta">Conservation 10 ans · art. 211 CGI</p>
      </div>
    </aside>
  );
}
