import { requireAdmin } from "@/server/admin-session";
import { listTemplates, TEMPLATE_VARIABLES } from "@/server/notification-templates";
import { PageHeader } from "@/components/ui";
import TemplatesEditor from "@/components/TemplatesEditor";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireAdmin();
  const templates = await listTemplates();
  return (
    <div className="grid gap-5">
      <PageHeader
        title="Message templates"
        description="Customize the WhatsApp and email messages sent to businesses. Use {variables} to insert details."
      />
      <TemplatesEditor templates={templates} variables={TEMPLATE_VARIABLES} />
    </div>
  );
}