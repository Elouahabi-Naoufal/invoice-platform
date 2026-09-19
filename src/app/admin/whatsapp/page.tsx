import { requireAdmin } from "@/server/admin-session";
import AdminWhatsAppSettings from "@/components/AdminWhatsAppSettings";
import { AdminPageHeader } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  await requireAdmin();
  return (
    <div>
      <AdminPageHeader
        eyebrow="Communication"
        title="WhatsApp"
        description="Connect the admin WhatsApp used to send approval and welcome messages."
      />
      <AdminWhatsAppSettings />
    </div>
  );
}