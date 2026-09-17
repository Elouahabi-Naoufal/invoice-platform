"use client";
import LocaleToggle from "@/components/LocaleToggle";
import ThemeToggle from "@/components/ThemeToggle";
import CompanySwitcher from "@/components/CompanySwitcher";
import UserMenu from "@/components/UserMenu";
import MobileNav from "@/components/MobileNav";
import CommandPalette, { CommandTrigger } from "@/components/CommandPalette";

interface Company {
  id: string;
  legalName: string;
  city?: string | null;
  defaultCurrency: string;
  logoPath?: string | null;
}

export default function AppHeader({
  user, companies, activeId, locale,
}: {
  user: { name: string; email: string };
  companies: Company[];
  activeId: string | null;
  locale: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-[#101828]/90">
      <div className="flex items-center gap-2 px-4 py-2.5 max-md:px-3">
        <MobileNav />
        <div className="hidden md:block">
          <CommandTrigger />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <LocaleToggle current={locale} />
          <ThemeToggle />
          <div className="mx-1 h-6 w-px bg-ink-200 dark:bg-white/10" />
          <CompanySwitcher companies={companies} activeId={activeId} />
          <UserMenu name={user.name} email={user.email} />
        </div>
      </div>
      <CommandPalette />
    </header>
  );
}
