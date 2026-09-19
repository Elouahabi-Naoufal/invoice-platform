"use client";
import { useState } from "react";
import { lookupWorkspace } from "@/server/admin-actions";

export default function WorkspaceLookupForm() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(f: FormData) {
    setBusy(true); setErr("");
    try {
      const res = await lookupWorkspace(String(f.get("email") ?? ""));
      if (res.error) setErr(res.error);
      else if (res.found && res.url) window.location.href = `${res.url}/login`;
      else setErr("No workspace found for that email. You can register below.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="grid gap-4">
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required className="input" placeholder="you@company.ma" />
      </div>
      {err && <p className="field-err">{err}</p>}
      <button type="submit" disabled={busy} className="btn-accent w-full">{busy ? "Looking up…" : "Find my workspace"}</button>
    </form>
  );
}