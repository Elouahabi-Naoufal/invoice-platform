"use client";
import { useState } from "react";
import { requestSupportAccess, revokeTenantSupport } from "@/server/admin-ops";

export default function TenantSupportPanel({ id, supportKey }: { id: string; supportKey: string | null }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function grant() {
    setBusy(true); setMsg("");
    try {
      const { url, expiresAt } = await requestSupportAccess(id, key);
      window.open(url, "_blank");
      setMsg(`Session opened (expires ${new Date(expiresAt).toLocaleTimeString()})`);
    } catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : "failed"}`); }
    finally { setBusy(false); }
  }

  async function revoke() {
    setBusy(true); setMsg("");
    try { await revokeTenantSupport(id); setMsg("Support access revoked"); }
    catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : "failed"}`); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-3">
      <p className="meta">Ask the tenant for the support key shown in their Settings → Support, then enter it to open a temporary read-only session.</p>
      {supportKey && (
        <div className="flex items-center gap-2 text-[12px] text-ink-500">
          <span>Key on file:</span>
          <code className="rounded bg-ink-100 px-1 dark:bg-white/10">{supportKey}</code>
        </div>
      )}
      <div className="flex gap-2">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="INV-XXXX-XXXX" className="input flex-1" />
        <button disabled={busy || !key} onClick={grant} className="btn-primary btn-sm">Open support session</button>
      </div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={revoke} className="btn-ghost btn-sm hover:text-red-700">Revoke all support access</button>
      </div>
      {msg && <p className="text-[12px] text-ink-500">{msg}</p>}
    </div>
  );
}