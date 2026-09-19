"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminPanel, AdminBadge, type AdmTone } from "@/components/admin-ui";
import { MessageCircle, Send, Link2, Unplug, Trash2, ShieldCheck, QrCode, Loader2 } from "lucide-react";

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

type Busy = "" | "connect" | "disconnect" | "reset" | "test";

const PHASE_META: Record<Status["phase"], { label: string; tone: AdmTone }> = {
  idle: { label: "Idle", tone: "neutral" },
  starting: { label: "Starting…", tone: "info" },
  qr: { label: "Waiting for scan", tone: "brand" },
  ready: { label: "Connected", tone: "success" },
  failed: { label: "Failed", tone: "error" },
  stopped: { label: "Stopped", tone: "neutral" },
};

export default function AdminWhatsAppSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/status", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      setStatus((await res.json()) as Status);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "WhatsApp status unavailable");
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), status?.phase === "qr" || status?.phase === "starting" ? 4000 : 10000);
    return () => clearInterval(interval);
  }, [load, status?.phase]);

  async function act(path: string, key: Exclude<Busy, "" | "test">) {
    setBusy(key); setError("");
    try {
      const res = await fetch(path, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setStatus((await res.json()) as Status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(""); setConfirmReset(false);
    }
  }

  async function sendTest() {
    setBusy("test"); setTestMsg("");
    try {
      const res = await fetch("/api/admin/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTestMsg("Test message sent.");
    } catch (e) {
      setTestMsg(`Error: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setBusy("");
    }
  }

  const phase = status ? PHASE_META[status.phase] : null;

  return (
    <div className="grid gap-6">
      <AdminPanel
        title="Connection"
        subtitle="Admin WhatsApp for platform messages"
        icon={<MessageCircle size={15} />}
        tone={status?.connected ? "success" : "brand"}
      >
        {!status || !phase ? (
          <div className="flex items-center gap-2 text-[13px] text-ink-500">
            <Loader2 size={15} className="animate-spin text-brand-500" /> Loading WhatsApp status…
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge tone={phase.tone} dot>{phase.label}</AdminBadge>
                {status.account && <AdminBadge tone="neutral">{status.account}</AdminBadge>}
                <AdminBadge tone={status.sessionExists ? "success" : "neutral"}>{status.sessionExists ? "Session saved" : "No saved session"}</AdminBadge>
              </div>

              {status.lastError && <p className="field-err mt-3">{status.lastError}</p>}

              <div className="mt-5 flex flex-wrap gap-2">
                <button disabled={busy !== "" || status.connected} onClick={() => void act("/api/admin/whatsapp/connect", "connect")} className="btn-accent btn-sm">
                  {busy === "connect" ? (<><Loader2 size={14} className="animate-spin" /> Connecting…</>) : status.connected ? (<><ShieldCheck size={14} /> Connected</>) : (<><Link2 size={14} /> Connect</>)}
                </button>
                <button disabled={busy !== "" || (!status.connected && status.phase !== "starting" && status.phase !== "qr")} onClick={() => void act("/api/admin/whatsapp/disconnect", "disconnect")} className="btn-outline btn-sm">
                  {busy === "disconnect" ? (<><Loader2 size={14} className="animate-spin" /> Disconnecting…</>) : (<><Unplug size={14} /> Disconnect</>)}
                </button>
                {!confirmReset ? (
                  <button disabled={busy !== ""} onClick={() => setConfirmReset(true)} className="btn-ghost btn-sm hover:text-red-700"><Trash2 size={14} /> Reset session</button>
                ) : (
                  <>
                    <button disabled={busy !== ""} onClick={() => void act("/api/admin/whatsapp/reset", "reset")} className="btn-danger btn-sm">{busy === "reset" ? "Resetting…" : "Confirm reset"}</button>
                    <button disabled={busy !== ""} onClick={() => setConfirmReset(false)} className="btn-ghost btn-sm">Keep session</button>
                  </>
                )}
              </div>
            </div>

            {status.phase === "qr" && status.qrImage && (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-xl border border-ink-200 bg-white p-3 shadow-doc dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={status.qrImage} alt="WhatsApp pairing QR code" className="h-52 w-52 rounded-lg" />
                </div>
                <p className="text-[11px] text-ink-500 dark:text-gray-400">{status.qrExpired ? "Code expired — refreshing…" : "Scan in WhatsApp → Linked devices"}</p>
              </div>
            )}
          </div>
        )}
        <p className="hint mt-4 inline-flex items-center gap-1.5"><QrCode size={12} /> This is the admin&apos;s WhatsApp, used to deliver approval and welcome messages. The session stays server-side.</p>
        {error && <p className="field-err mt-2">{error}</p>}
      </AdminPanel>

      <AdminPanel title="Send a test message" subtitle="Verify the connection before relying on it" icon={<Send size={15} />} tone="success">
        <div className="grid gap-3 sm:flex sm:items-center">
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="+212 6XX XXX XXX"
            className="input max-w-xs"
          />
          <button disabled={busy !== "" || !testTo || !status?.connected} onClick={() => void sendTest()} className="btn-accent btn-sm">
            {busy === "test" ? (<><Loader2 size={14} className="animate-spin" /> Sending…</>) : (<><Send size={14} /> Send test</>)}
          </button>
        </div>
        {testMsg && <p className="mt-2 text-[12px] text-ink-500">{testMsg}</p>}
        {!status?.connected && <p className="hint mt-2">Connect WhatsApp first.</p>}
      </AdminPanel>
    </div>
  );
}