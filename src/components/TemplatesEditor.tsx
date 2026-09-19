"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveNotificationTemplate, resetNotificationTemplate } from "@/server/admin-ops";
import { AdminPanel, AdminBadge } from "@/components/admin-ui";
import { FileText, RefreshCw, Variable } from "lucide-react";

interface Tpl {
  type: string;
  subject: string;
  body: string;
  enabled: boolean;
  isDefault: boolean;
}

const LABELS: Record<string, string> = {
  REGISTRATION_RECEIVED: "Registration received",
  APPROVED: "Approved",
  WELCOME: "Welcome (with credentials)",
  SUSPENDED: "Suspended",
};

export default function TemplatesEditor({ templates, variables }: { templates: Tpl[]; variables: { token: string; description: string }[] }) {
  const r = useRouter();
  const [active, setActive] = useState(templates[0]?.type ?? "");
  const tpl = templates.find((t) => t.type === active);
  const [subject, setSubject] = useState(tpl?.subject ?? "");
  const [body, setBody] = useState(tpl?.body ?? "");
  const [enabled, setEnabled] = useState(tpl?.enabled ?? true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  function select(type: string) {
    const t = templates.find((x) => x.type === type);
    setActive(type);
    setSubject(t?.subject ?? "");
    setBody(t?.body ?? "");
    setEnabled(t?.enabled ?? true);
    setMsg("");
  }

  async function save() {
    setBusy("save"); setMsg("");
    try {
      await saveNotificationTemplate(active, { subject, body, enabled });
      setMsg("Saved");
      r.refresh();
    } catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : "failed"}`); }
    finally { setBusy(""); }
  }

  async function reset() {
    setBusy("reset"); setMsg("");
    try {
      await resetNotificationTemplate(active);
      setMsg("Reset to default");
      r.refresh();
    } catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : "failed"}`); }
    finally { setBusy(""); }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200/70 px-4 py-3 dark:border-white/10">
          <h2 className="text-[13px] font-semibold text-ink-950 dark:text-white">Templates</h2>
          <p className="text-[11px] text-ink-500">Select a message to edit</p>
        </div>
        <div className="flex flex-col p-2 max-lg:flex-row max-lg:overflow-x-auto">
          {templates.map((t) => (
            <button
              key={t.type}
              onClick={() => select(t.type)}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                active === t.type ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-ink-500 hover:bg-ink-100 dark:text-gray-400 dark:hover:bg-white/10"
              }`}
            >
              <span className="flex items-center gap-2"><FileText size={14} className="text-ink-400" />{LABELS[t.type] ?? t.type}</span>
              {!t.enabled ? <AdminBadge tone="neutral">Off</AdminBadge> : <AdminBadge tone="success" dot>On</AdminBadge>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        <AdminPanel
          title={LABELS[active] ?? active}
          subtitle="Email subject and message body"
          icon={<FileText size={15} />}
          tone="brand"
          action={
            <button
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? "bg-brand-500" : "bg-ink-200 dark:bg-white/15"}`}
              role="switch"
              aria-checked={enabled}
              aria-label="Enabled"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </button>
          }
        >
          <div className="grid gap-4">
            <div>
              <label className="label">Email subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Message body</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="input font-mono text-[12px] leading-relaxed" />
              <p className="hint">Used for both WhatsApp and email. Line breaks are preserved.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={save} disabled={!!busy} className="btn-accent btn-sm">{busy === "save" ? "Saving…" : "Save changes"}</button>
              <button onClick={reset} disabled={!!busy} className="btn-outline btn-sm"><RefreshCw size={13} /> Reset to default</button>
              {msg && <span className="text-[12px] text-ink-500">{msg}</span>}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Variables" subtitle="Inserted automatically when a message is sent" icon={<Variable size={15} />} tone="neutral">
          <div className="grid gap-2 sm:grid-cols-2">
            {variables.map((v) => (
              <div key={v.token} className="flex items-center gap-2.5 rounded-lg border border-ink-200/70 px-3 py-2 dark:border-white/10">
                <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-600 dark:bg-white/10 dark:text-brand-400">{v.token}</code>
                <span className="text-[12px] text-ink-500 dark:text-gray-400">{v.description}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}