"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserPlus, Building2, Rocket, Bell, MessageCircle, FileText, ScrollText, LogOut, ExternalLink } from "lucide-react";
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
      { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { href: "/admin/templates", label: "Templates", icon: FileText },
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
  const name = email.split("@")[0] ?? "Admin";

  return (
    <aside className="flex w-full shrink-0 flex-col bg-white md:sticky md:top-0 md:h-screen md:w-72 md:border-r md:border-ink-200/80 dark:bg-[#0c111d] dark:md:border-white/10">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 shadow-[0_6px_16px_rgba(70,95,255,0.35)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/invora-mark.png" alt="" className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-ink-950 dark:text-white">Invora</div>
          <div className="text-[11px] font-medium text-ink-400 dark:text-gray-500">Platform console</div>
        </div>
      </div>

      <nav className="scroll-thin flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4 max-md:flex-row max-md:gap-2 max-md:overflow-x-auto">
        {GROUPS.map((g) => (
          <div key={g.label} className="max-md:contents">
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400 dark:text-gray-500 max-md:hidden">{g.label}</div>
            <div className="flex flex-col gap-0.5 max-md:flex-row">
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = isActive(it.href, it.exact);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "relative flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "text-ink-500 hover:bg-ink-100 hover:text-ink-950 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-500" />}
                    <Icon size={17} className={active ? "text-brand-600 dark:text-brand-400" : "text-ink-400 dark:text-gray-500"} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-200/80 px-3 py-3 dark:border-white/10 max-md:hidden">
        <div className="flex items-center gap-2.5 rounded-lg bg-ink-50 p-2.5 dark:bg-white/5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-500 text-[13px] font-semibold text-white">
            {name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12px] font-semibold text-ink-950 dark:text-white">{name}</div>
            <div className="truncate text-[11px] text-ink-500 dark:text-gray-400">{email}</div>
          </div>
          <form action={adminLogout}>
            <button className="grid h-8 w-8 place-items-center rounded-md text-ink-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10 dark:hover:text-error-400" title="Sign out">
              <LogOut size={15} />
            </button>
          </form>
        </div>
        <a href="/" target="_blank" className="mt-2 flex items-center gap-1.5 px-1 text-[11px] font-medium text-ink-400 hover:text-ink-700 dark:text-gray-500 dark:hover:text-white">
          <ExternalLink size={12} /> View public site
        </a>
      </div>
    </aside>
  );
}