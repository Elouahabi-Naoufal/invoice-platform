"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendTenantNotification } from "@/server/admin-ops";

export default function TenantNotifyButtons({ id }: { id: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function send(type: "APPROVED" | "WELCOME") {
    setBusy(type); setMsg("");
    try {
      await sendTenantNotification(id, type);
      setMsg(`${type} queued — sending…`);
      r.refresh();
    } catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : "failed"}`); }
    finally { setBusy(null); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={!!busy} onClick={() => send("APPROVED")} className="btn-outline btn-sm">{busy === "APPROVED" ? "Sending…" : "Send approval"}</button>
      <button disabled={!!busy} onClick={() => send("WELCOME")} className="btn-outline btn-sm">{busy === "WELCOME" ? "Sending…" : "Send welcome"}</button>
      {msg && <span className="text-[12px] text-ink-500">{msg}</span>}
    </div>
  );
}