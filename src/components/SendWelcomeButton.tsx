"use client";
import { useState } from "react";
import { sendTenantWelcome } from "@/server/hub-welcome";

export default function SendWelcomeButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function send() {
    setBusy(true); setResult("");
    try {
      await sendTenantWelcome(id);
      setResult("Welcome message sent!");
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : "failed"}`);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={send} disabled={busy} className="btn-primary btn-sm">{busy ? "Sending…" : "Send welcome via WhatsApp"}</button>
      {result && <p className="text-sm text-ink-500 mt-1">{result}</p>}
    </div>
  );
}