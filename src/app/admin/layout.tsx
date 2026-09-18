import { requireAdmin } from "@/server/admin-auth";
import Link from "next/link";
import { adminLogout } from "@/server/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-ink-200 bg-ink-50 p-4 dark:border-white/10 dark:bg-[#0c111d]">
        <div className="mb-6 flex items-center gap-2"><span className="text-sm font-semibold tracking-tight">Invora · Admin</span></div>
        <nav className="flex flex-col gap-1 text-[13px]">
          <Link href="/admin" className="rounded px-2 py-1.5 hover:bg-ink-100 dark:hover:bg-white/10">Dashboard</Link>
          <Link href="/admin/registrations" className="rounded px-2 py-1.5 hover:bg-ink-100 dark:hover:bg-white/10">Registrations</Link>
        </nav>
        <div className="mt-auto pt-4 border-t border-ink-200 dark:border-white/10">
          <p className="mb-1 text-[12px] text-ink-500">{admin.email}</p>
          <form action={adminLogout}><button className="text-[12px] text-ink-400 hover:text-red-600">Sign out</button></form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}