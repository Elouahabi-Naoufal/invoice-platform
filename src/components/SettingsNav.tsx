"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, Mail, MessageCircle, Lock, Workflow, Database } from "lucide-react";

const TABS = [
  { href: "/settings", label: "General", icon: SlidersHorizontal, exact: true },
  { href: "/settings/email", label: "Email", icon: Mail, exact: true },
  { href: "/settings/whatsapp", label: "WhatsApp", icon: MessageCircle, exact: true },
  { href: "/settings/security", label: "Security", icon: Lock, exact: true },
  { href: "/settings/automation", label: "Automation", icon: Workflow, exact: true },
  { href: "/settings/data", label: "Data", icon: Database, exact: true },
];

export default function SettingsNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-ink-200 pb-px dark:border-white/10">
      {TABS.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
              active
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-950 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Icon size={15} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
