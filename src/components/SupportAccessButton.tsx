"use client";
import { useState } from "react";
import { generateSupportAccessUrl } from "@/server/hub-admin";

export default function SupportAccessButton({ tenantId, adminId }: { tenantId: string; adminId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function open() {
    setBusy(true); setErr("");
    try {
      const { url } = await generateSupportAccessUrl(tenantId, adminId);
      window.open(url, "_blank");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={open} disabled={busy} className="btn-outline btn-sm">{busy ? "Generating…" : "Support access (30 min)"}</button>
      {err && <p className="field-err mt-1">{err}</p>}
    </div>
  );
}