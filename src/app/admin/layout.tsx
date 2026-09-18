import { requireAdmin } from "@/server/admin-session";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin: { id: string; email: string };
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-[#101828] md:flex">
      <AdminNav email={admin.email} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-5 py-7 sm:px-8">{children}</main>
      </div>
    </div>
  );
}