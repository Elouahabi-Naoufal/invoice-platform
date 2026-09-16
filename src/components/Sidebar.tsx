"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, Building2, Settings, Plus, Receipt, Package, Repeat, Bell, Link2, Shield, Handshake, Globe, FileDown, Languages, MessageCircle, BarChart3, Mail } from "lucide-react";

const NAV = [
  {
    group: "Menu",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/invoices", label: "Invoices", icon: FileText, exact: false },
      { href: "/reports", label: "Reports", icon: BarChart3, exact: false },
      { href: "/clients", label: "Clients", icon: Users, exact: false },
      { href: "/products", label: "Products", icon: Package, exact: false },
      { href: "/recurring", label: "Recurring", icon: Repeat, exact: false },
      { href: "/relances", label: "Relances", icon: Bell, exact: false },
      { href: "/payment-links", label: "Payment links", icon: Link2, exact: false },
      { href: "/lettrage", label: "Lettrage", icon: Handshake, exact: false },
      { href: "/portal", label: "Portal", icon: Globe, exact: false },
      { href: "/exports", label: "Exports", icon: FileDown, exact: false },
      { href: "/members", label: "Team", icon: Shield, exact: false },
      { href: "/companies", label: "Companies", icon: Building2, exact: false },
    ],
  },
  {
    group: "General",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, exact: true },
      { href: "/settings/email", label: "Email", icon: Mail, exact: true },
      { href: "/settings/whatsapp", label: "WhatsApp", icon: MessageCircle, exact: true },
    ],
  },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col overflow-y-auto border-r border-ink-200 bg-white px-4 py-5 max-lg:hidden dark:border-white/10 dark:bg-[#101828]">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-sm">
          <Receipt size={19} />
        </span>
        <span className="text-xl font-semibold tracking-tight text-ink-950 dark:text-white">
          Facturo
        </span>
      </Link>
      <nav className="flex flex-col gap-6">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-ink-400">
              {g.group}
            </p>
            <div className="flex flex-col gap-1">
              {g.items.map((n) => {
                const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
                const Icon = n.icon;
                return (
                  <Link key={n.href} href={n.href} className={`navlink ${active ? "navlink-active" : ""}`}>
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
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
      <div className="mt-auto rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
        <p className="text-[13px] font-semibold text-brand-700 dark:text-brand-400">Art. 211 CGI</p>
        <p className="meta mt-0.5">Invoices are kept 10 years and stay immutable once finalized.</p>
      </div>
    </aside>
  );
}
