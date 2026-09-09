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
    <aside
      className="flex w-[216px] shrink-0 flex-col px-3 py-5 max-md:hidden"
      style={{
        background: "linear-gradient(to bottom, #46586e 0%, #33414f 50%, #232f3e 100%)",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.15), 2px 0 6px rgba(20,40,70,0.35)",
      }}
    >
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-[10px] text-[15px] font-bold text-white"
          style={{
            background: "linear-gradient(to bottom, #6db3e8 0%, #2273b8 50%, #17578f 100%)",
            border: "1px solid #0f3d68",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 3px rgba(0,0,0,0.5)",
            textShadow: "0 1px 1px rgba(0,0,0,0.5)",
          }}
        >
          F
        </span>
        <span className="text-[15px] font-bold tracking-tight text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
          Facturo
        </span>
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
        <p className="text-[11px]" style={{ color: "#93a5b8", textShadow: "0 1px 1px rgba(0,0,0,0.5)" }}>
          Conservation 10 ans · art. 211 CGI
        </p>
      </div>
    </aside>
  );
}
