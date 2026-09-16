"use client";
import { useCallback, useEffect, useState } from "react";
import { getEmailSettings, saveEmailSettings, testEmailSettings, disconnectEmailSettings } from "@/server/email-settings";
import { useToast } from "@/components/ui";

interface Settings {
  configured: boolean;
  enabled?: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  hasPassword?: boolean;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
  lastTestAt?: string | null;
  lastTestOk?: boolean | null;
  lastTestError?: string | null;
  envFallback: boolean;
}

const PRESETS: { label: string; host: string; port: number; secure: boolean }[] = [
  { label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 465, secure: true },
  { label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: 587, secure: false },
  { label: "OVH", host: "ssl0.ovh.net", port: 465, secure: true },
  { label: "Custom SMTP", host: "", port: 587, secure: false },
];

export default function EmailSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState<"" | "save" | "test" | "disconnect">("");
  const [err, setErr] = useState("");
  const [testTo, setTestTo] = useState("");
  const [form, setForm] = useState({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    fromAddress: "",
    fromName: "",
    replyTo: "",
    enabled: true,
  });

  const load = useCallback(async () => {
    try {
      const s = (await getEmailSettings()) as Settings;
      setSettings(s);
      if (s.configured) {
        setForm({
          host: s.host ?? "",
          port: s.port ?? 587,
          secure: s.secure ?? false,
          username: s.username ?? "",
          password: "",
          fromAddress: s.fromAddress ?? "",
          fromName: s.fromName ?? "",
          replyTo: s.replyTo ?? "",
          enabled: s.enabled ?? true,
        });
        setTestTo(s.fromAddress ?? "");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to load email settings");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function applyPreset(label: string) {
    const p = PRESETS.find((x) => x.label === label);
    if (!p) return;
    setForm((f) => ({ ...f, host: p.host, port: p.port, secure: p.secure }));
  }

  async function save() {
    setErr("");
    setBusy("save");
    try {
      await saveEmailSettings({
        host: form.host,
        port: form.port,
        secure: form.secure,
        username: form.username || null,
        password: form.password || null,
        fromAddress: form.fromAddress,
        fromName: form.fromName || null,
        replyTo: form.replyTo || null,
        enabled: form.enabled,
      });
      toast({ kind: "ok", title: "Email connection saved" });
      await load();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Save failed";
      setErr(m);
      toast({ kind: "err", title: "Unable to save", body: m });
    } finally {
      setBusy("");
    }
  }

  async function test() {
    setErr("");
    setBusy("test");
    try {
      await testEmailSettings(testTo);
      toast({ kind: "ok", title: "Test email sent", body: `Check ${testTo}` });
      await load();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Test failed";
      setErr(m);
      toast({ kind: "err", title: "Test failed", body: m });
    } finally {
      setBusy("");
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    try {
      await disconnectEmailSettings();
      toast({ kind: "ok", title: "Email disconnected" });
      setSettings({ configured: false, envFallback: settings?.envFallback ?? false });
      await load();
    } catch (e) {
      toast({ kind: "err", title: "Failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy("");
    }
  }

  if (!settings) return <p className="meta">Loading email settings…</p>;

  return (
    <div className="grid gap-3">
      <div className="card p-5">
        <h2 className="section-title mb-1">Connect your email</h2>
        <p className="mb-4 text-[13px] text-ink-500 dark:text-stone-400">
          Invoices, reminders and quotes are sent from this mailbox. Use an app password for Gmail/Outlook
          (not your normal login password).
        </p>
        {settings.configured && (
          <p className="mb-3 text-[13px]">
            Status:{" "}
            {settings.enabled ? <span className="badge badge-emerald">Connected</span> : <span className="badge">Disabled</span>}
            {settings.lastTestAt ? (
              <span className="meta ml-2">
                Last test {new Date(settings.lastTestAt).toLocaleString()} —{" "}
                {settings.lastTestOk ? "OK" : `failed: ${settings.lastTestError ?? ""}`}
              </span>
            ) : null}
          </p>
        )}
        {!settings.configured && settings.envFallback && (
          <p className="mb-3 text-[13px] text-ink-500 dark:text-stone-400">
            No mailbox connected yet — currently using the server SMTP environment variables.
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">Provider</label>
            <select className="input" defaultValue="" onChange={(e) => applyPreset(e.target.value)}>
              <option value="">— choose a preset —</option>
              {PRESETS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">SMTP host</label>
            <input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.gmail.com" className="input" />
          </div>
          <div>
            <label className="label">Port</label>
            <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} className="input" />
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} />
            Use SSL/TLS (usually on for port 465)
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Enable sending from this mailbox
          </label>
          <div>
            <label className="label">Username</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="you@yourbusiness.ma" className="input" autoComplete="off" />
          </div>
          <div>
            <label className="label">Password {settings.hasPassword ? "(leave blank to keep current)" : ""}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={settings.hasPassword ? "••••••••" : "app password"} className="input" autoComplete="new-password" />
          </div>
          <div>
            <label className="label">From address *</label>
            <input value={form.fromAddress} onChange={(e) => setForm({ ...form, fromAddress: e.target.value })} placeholder="facturation@yourbusiness.ma" className="input" />
          </div>
          <div>
            <label className="label">From name</label>
            <input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Your business" className="input" />
          </div>
          <div>
            <label className="label">Reply-to (optional)</label>
            <input value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} placeholder="contact@yourbusiness.ma" className="input" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={busy !== "" || !form.host || !form.fromAddress} onClick={save} className="btn-primary btn-sm">
            {busy === "save" ? "Saving…" : "Save connection"}
          </button>
          {settings.configured && (
            <button disabled={busy !== ""} onClick={disconnect} className="btn-ghost btn-sm hover:text-red-700">
              {busy === "disconnect" ? "Removing…" : "Disconnect"}
            </button>
          )}
        </div>
        {err && <p className="field-err mt-3">{err}</p>}
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-1">Send a test email</h2>
        <p className="mb-3 text-[13px] text-ink-500 dark:text-stone-400">
          Confirms the connection before you email real clients. Save the connection first.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[260px] flex-1">
            <label className="label">Recipient</label>
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@yourbusiness.ma" className="input" />
          </div>
          <button disabled={busy !== "" || !testTo.includes("@") || !settings.configured} onClick={test} className="btn-outline btn-sm">
            {busy === "test" ? "Sending…" : "Send test"}
          </button>
        </div>
      </div>
    </div>
  );
}
