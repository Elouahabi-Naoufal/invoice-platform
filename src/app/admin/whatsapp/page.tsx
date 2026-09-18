import { requireAdmin } from "@/server/admin-auth";
import AdminWhatsAppSettings from "@/components/AdminWhatsAppSettings";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="page-title mb-1">WhatsApp</h1>
      <p className="meta mb-6">Connect the admin WhatsApp used for approval and welcome messages.</p>
      <AdminWhatsAppSettings />
    </div>
  );
}