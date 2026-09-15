import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import WhatsAppSettings from "@/components/WhatsAppSettings";

export default async function WhatsAppSettingsPage() {
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }
  return (
    <div className="max-w-2xl">
      <Link href="/settings" className="mb-3 inline-flex items-center gap-1 text-[13px] text-ink-500 dark:text-stone-400 hover:text-ink-950 dark:hover:text-white">
        <ChevronLeft size={15} /> Settings
      </Link>
      <h1 className="page-title mb-5">WhatsApp sending</h1>
      <WhatsAppSettings />
    </div>
  );
}
