import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import SettingsNav from "@/components/SettingsNav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-4">Settings</h1>
      <SettingsNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
