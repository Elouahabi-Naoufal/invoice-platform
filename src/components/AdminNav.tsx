"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserPlus, Building2, Rocket, Bell, MessageCircle, ScrollText, LogOut, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/components/ui";
import { adminLogout } from "@/server/admin-auth";

const GROUPS: { label: string; items: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/registrations", label: "Registrations", icon: UserPlus },
      { href: "/admin/tenants", label: "Tenants", icon: Building2 },
      { href: "/admin/provisioning", label: "Provisioning", icon: Rocket },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/templates", label: "Templates", icon: FileText },
      { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/audit", label: "Audit log", icon: ScrollText }],
  },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-ink-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r dark:border-white/10 dark:bg-[#0c111d]">
      <div className="flex items-center gap-2.5 px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/invora-mark.png" alt="" className="h-8 w-8" />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Invora</div>
          <div className="text-[11px] font-medium text-ink-400">Platform console</div>
        </div>
      </div>

      <nav className="scroll-thin flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4 max-md:flex-row max-md:gap-2 max-md:overflow-x-auto">
        {GROUPS.map((g) => (
          <div key={g.label} className="max-md:contents">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400 max-md:hidden">{g.label}</div>
            <div className="flex flex-col gap-0.5 max-md:flex-row">
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = isActive(it.href, it.exact);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "flex items-center gap-2.5 whitespace-nowrap rounded px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                        : "text-ink-500 hover:bg-ink-100 hover:text-ink-950 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                    )}
                  >
                    <Icon size={16} className={active ? "" : "opacity-80"} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-200 px-4 py-3 dark:border-white/10 max-md:hidden">
        <div className="mb-2 truncate text-[12px] text-ink-500" title={email}>{email}</div>
        <div className="flex items-center justify-between">
          <a href="/" target="_blank" className="inline-flex items-center gap-1 text-[12px] text-ink-400 hover:text-ink-700 dark:hover:text-white">
            <ExternalLink size={12} /> View site
          </a>
          <form action={adminLogout}>
            <button className="inline-flex items-center gap-1 text-[12px] text-ink-400 hover:text-red-600">
              <LogOut size={12} /> Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}