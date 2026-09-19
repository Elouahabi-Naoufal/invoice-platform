"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveNotificationTemplate, resetNotificationTemplate } from "@/server/admin-ops";

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
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="card p-2">
        <div className="flex flex-col">
          {templates.map((t) => (
            <button
              key={t.type}
              onClick={() => select(t.type)}
              className={`flex items-center justify-between rounded px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                active === t.type ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" : "text-ink-500 hover:bg-ink-100 dark:text-gray-400 dark:hover:bg-white/10"
              }`}
            >
              {LABELS[t.type] ?? t.type}
              {!t.enabled && <span className="badge">off</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">{LABELS[active] ?? active}</h2>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
            </label>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="label">Email subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Message body</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="input font-mono text-[12px]" />
              <p className="hint">Used for both WhatsApp and email. Line breaks are preserved.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={save} disabled={!!busy} className="btn-primary btn-sm">{busy === "save" ? "Saving…" : "Save"}</button>
              <button onClick={reset} disabled={!!busy} className="btn-outline btn-sm">{busy === "reset" ? "Resetting…" : "Reset to default"}</button>
              {msg && <span className="text-[12px] text-ink-500">{msg}</span>}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-2">Variables</h2>
          <p className="meta mb-3">Use these placeholders in the subject or body. They are replaced when the message is sent.</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {variables.map((v) => (
              <div key={v.token} className="flex items-center gap-2 text-[12px]">
                <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-brand-600 dark:bg-white/10 dark:text-brand-400">{v.token}</code>
                <span className="text-ink-500">{v.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}