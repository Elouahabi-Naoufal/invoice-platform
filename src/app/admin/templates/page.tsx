import { requireAdmin } from "@/server/admin-session";
import { listTemplates, TEMPLATE_VARIABLES } from "@/server/notification-templates";
import { AdminPageHeader } from "@/components/admin-ui";
import TemplatesEditor from "@/components/TemplatesEditor";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireAdmin();
  const templates = await listTemplates();
  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Communication"
        title="Message templates"
        description="Customize the messages sent to businesses. Use {variables} to insert business details."
      />
      <TemplatesEditor templates={templates} variables={TEMPLATE_VARIABLES} />
    </div>
  );
}