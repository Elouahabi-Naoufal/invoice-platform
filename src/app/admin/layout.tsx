import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/hub-auth";
import { adminLogout } from "@/server/hub-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin: { id: string; email: string; displayName: string };
  try { admin = await requireAdmin(); } catch { redirect("/admin/login"); }

  return (
    <div>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-ink-200 bg-white px-4 dark:border-white/10 dark:bg-[#0a0f1a]">
        <span className="text-sm font-semibold tracking-tight">Invora · Admin</span>
        <nav className="ml-auto flex items-center gap-3 text-[13px]">
          <Link href="/admin" className="font-medium text-brand-600 hover:text-brand-700">Dashboard</Link>
          <span className="text-ink-300">|</span>
          <span className="text-ink-500">{admin.displayName}</span>
          <form action={adminLogout}><button className="text-ink-400 hover:text-red-600">Sign out</button></form>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}