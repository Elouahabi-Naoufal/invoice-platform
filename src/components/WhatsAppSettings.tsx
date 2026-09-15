"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui";

interface Status {
  phase: "idle" | "starting" | "qr" | "ready" | "failed" | "stopped";
  connected: boolean;
  qrImage: string | null;
  qrAgeMs: number | null;
  qrExpired: boolean;
  account: string | null;
  lastError: string | null;
  sessionExists: boolean;
  lastChangeAt: string;
}

interface Settings {
  companyId?: string;
  companyName?: string;
  enabled?: boolean;
  template?: string;
  isDefault?: boolean;
  defaultTemplate?: string;
  tokens?: string[];
  noCompany?: boolean;
  message?: string;
}

type Busy = "" | "connect" | "disconnect" | "reset" | "save";

export default function WhatsAppSettings() {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [template, setTemplate] = useState("");
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        fetch("/api/whatsapp/status", { cache: "no-store" }),
        fetch("/api/whatsapp/settings", { cache: "no-store" }),
      ]);
      if (!statusRes.ok) throw new Error(await statusRes.text());
      if (!settingsRes.ok) throw new Error(await settingsRes.text());
      const nextStatus = (await statusRes.json()) as Status;
      const nextSettings = (await settingsRes.json()) as Settings;
      setStatus(nextStatus);
      setSettings(nextSettings);
      if (!nextSettings.noCompany) {
        setEnabled(nextSettings.enabled ?? false);
        setTemplate(nextSettings.template ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "WhatsApp settings unavailable");
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(
      () => {
        void load();
      },
      status?.phase === "qr" || status?.phase === "starting" ? 4000 : 10000
    );
    return () => clearInterval(interval);
  }, [load, status?.phase]);

  async function act(path: string, key: Exclude<Busy, "" | "save">, success: string) {
    setError("");
    setBusy(key);
    try {
      const res = await fetch(path, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setStatus((await res.json()) as Status);
      toast({ kind: "ok", title: success });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      setError(message);
      toast({ kind: "err", title: `${success} failed`, body: message });
    } finally {
      setBusy("");
      setConfirmReset(false);
    }
  }

  async function save() {
    setError("");
    setBusy("save");
    try {
      const res = await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, template }),
      });
      if (!res.ok) throw new Error(await res.text());
      const next = (await res.json()) as Settings;
      setSettings(next);
      setEnabled(next.enabled ?? false);
      setTemplate(next.template ?? "");
      toast({ kind: "ok", title: "WhatsApp settings saved" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      setError(message);
      toast({ kind: "err", title: "Unable to save WhatsApp settings", body: message });
    } finally {
      setBusy("");
    }
  }

  if (settings?.noCompany) {
    return (
      <div className="card p-5">
        <h2 className="section-title mb-1">No company yet</h2>
        <p className="text-[13px] text-ink-500 dark:text-stone-400">
          WhatsApp sending is configured per company. Create your first company, then come back
          here to pair WhatsApp and set your message template.
        </p>
        <Link href="/companies" className="btn-primary btn-sm mt-4 inline-flex">Create a company</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="card p-5">
        <h2 className="section-title mb-1">Connection</h2>
        {!status || !settings ? (
          <p className="meta">Loading WhatsApp status…</p>
        ) : (
          <>
            <p className="text-[13px] text-ink-500 dark:text-stone-400">
              Company: <strong className="text-ink-950 dark:text-stone-100">{settings.companyName}</strong>
              {" · "}Phase: <strong className="text-ink-950 dark:text-stone-100">{status.phase}</strong>
              {status.account ? ` · Account ${status.account}` : ""}
              {status.sessionExists ? " · Session saved" : " · No saved session"}
            </p>
            {status.lastError && <p className="field-err mt-2">{status.lastError}</p>}
            {status.phase === "qr" && status.qrImage && (
              <div className="mt-4">
                <img src={status.qrImage} alt="WhatsApp pairing QR code" className="h-56 w-56 rounded-lg border border-ink-200 dark:border-white/10" />
                <p className="meta mt-2">
                  Scan this code in WhatsApp → Linked devices.
                  {status.qrExpired ? " This code expired; waiting for a fresh code." : ""}
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={busy !== "" || status.connected} onClick={() => void act("/api/whatsapp/connect", "connect", "WhatsApp connecting")} className="btn-primary btn-sm">
                {busy === "connect" ? "Connecting…" : status.connected ? "Connected" : "Connect"}
              </button>
              <button disabled={busy !== "" || (!status.connected && status.phase !== "starting" && status.phase !== "qr")} onClick={() => void act("/api/whatsapp/disconnect", "disconnect", "WhatsApp disconnected")} className="btn-outline btn-sm">
                {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
              </button>
              {!confirmReset ? (
                <button disabled={busy !== ""} onClick={() => setConfirmReset(true)} className="btn-ghost btn-sm hover:text-red-700">
                  Reset session
                </button>
              ) : (
                <>
                  <button disabled={busy !== ""} onClick={() => void act("/api/whatsapp/reset", "reset", "WhatsApp session reset")} className="btn-danger btn-sm">
                    {busy === "reset" ? "Resetting…" : "Confirm reset"}
                  </button>
                  <button disabled={busy !== ""} onClick={() => setConfirmReset(false)} className="btn-ghost btn-sm">
                    Keep session
                  </button>
                </>
              )}
            </div>
            <p className="hint mt-3">The browser session stays on the server and is never sent to the browser. Only this QR image is shown for pairing.</p>
          </>
        )}
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-1">Sending template</h2>
        {!settings ? (
          <p className="meta">Loading template…</p>
        ) : (
          <div className="grid gap-3">
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Enable WhatsApp PDF sending for {settings.companyName}
            </label>
            <div>
              <label className="label">Message template</label>
              <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={5} maxLength={1000} className="input" />
              <p className="hint">Placeholders: {(settings.tokens ?? []).map((t) => `{${t}}`).join(" ")}. Messages are capped at 1000 characters.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy !== ""} onClick={() => void save()} className="btn-primary btn-sm">
                {busy === "save" ? "Saving…" : "Save template"}
              </button>
              <button disabled={busy !== ""} onClick={() => setTemplate(settings.defaultTemplate ?? "")} className="btn-ghost btn-sm">
                Restore default
              </button>
            </div>
          </div>
        )}
        {error && <p className="field-err mt-3">{error}</p>}
      </div>
    </div>
  );
}
