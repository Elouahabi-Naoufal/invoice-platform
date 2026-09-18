"use client";
import { useCallback, useEffect, useState } from "react";

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

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <h2 className="section-title mb-1">Connection</h2>
        {!status ? (
          <p className="meta">Loading WhatsApp status…</p>
        ) : (
          <>
            <p className="text-[13px] text-ink-500 dark:text-stone-400">
              Phase: <strong className="text-ink-950 dark:text-stone-100">{status.phase}</strong>
              {status.account ? ` · Account ${status.account}` : ""}
              {status.sessionExists ? " · Session saved" : " · No saved session"}
            </p>
            {status.lastError && <p className="field-err mt-2">{status.lastError}</p>}
            {status.phase === "qr" && status.qrImage && (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={status.qrImage} alt="WhatsApp pairing QR code" className="h-56 w-56 rounded-lg border border-ink-200 dark:border-white/10" />
                <p className="meta mt-2">Scan in WhatsApp → Linked devices. {status.qrExpired ? "Code expired; waiting for a fresh one." : ""}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={busy !== "" || status.connected} onClick={() => void act("/api/admin/whatsapp/connect", "connect")} className="btn-primary btn-sm">
                {busy === "connect" ? "Connecting…" : status.connected ? "Connected" : "Connect"}
              </button>
              <button disabled={busy !== "" || (!status.connected && status.phase !== "starting" && status.phase !== "qr")} onClick={() => void act("/api/admin/whatsapp/disconnect", "disconnect")} className="btn-outline btn-sm">
                {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
              </button>
              {!confirmReset ? (
                <button disabled={busy !== ""} onClick={() => setConfirmReset(true)} className="btn-ghost btn-sm hover:text-red-700">Reset session</button>
              ) : (
                <>
                  <button disabled={busy !== ""} onClick={() => void act("/api/admin/whatsapp/reset", "reset")} className="btn-danger btn-sm">{busy === "reset" ? "Resetting…" : "Confirm reset"}</button>
                  <button disabled={busy !== ""} onClick={() => setConfirmReset(false)} className="btn-ghost btn-sm">Keep session</button>
                </>
              )}
            </div>
            <p className="hint mt-3">This is the admin&apos;s WhatsApp, used to send approval and welcome messages to new businesses. The session stays server-side.</p>
          </>
        )}
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-1">Send a test message</h2>
        <p className="meta mb-3">Verify the connection by sending a message to any number.</p>
        <div className="flex flex-wrap gap-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+212 6XX XXX XXX" className="input flex-1 min-w-[220px]" />
          <button disabled={busy !== "" || !testTo || !status?.connected} onClick={() => void sendTest()} className="btn-primary btn-sm">
            {busy === "test" ? "Sending…" : "Send test"}
          </button>
        </div>
        {testMsg && <p className="text-[12px] text-ink-500 mt-2">{testMsg}</p>}
        {!status?.connected && <p className="hint mt-2">Connect WhatsApp first.</p>}
        {error && <p className="field-err mt-3">{error}</p>}
      </div>
    </div>
  );
}