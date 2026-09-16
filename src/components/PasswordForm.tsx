"use client";
import { useState } from "react";
import { changePassword } from "@/server/auth";
import { useToast } from "@/components/ui";

export default function PasswordForm() {
  const toast = useToast();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(fd: FormData) {
    setErr("");
    setBusy(true);
    try {
      await changePassword(String(fd.get("current") ?? ""), String(fd.get("next") ?? ""));
      toast({ kind: "ok", title: "Password changed" });
      (document.getElementById("pw-form") as HTMLFormElement | null)?.reset();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Failed";
      setErr(m);
      toast({ kind: "err", title: m });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="pw-form" action={submit} className="grid max-w-sm gap-3">
      <div>
        <label className="label">Current password</label>
        <input name="current" type="password" required autoComplete="current-password" className="input" />
      </div>
      <div>
        <label className="label">New password (min 8 characters)</label>
        <input name="next" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      {err && <p className="field-err">{err}</p>}
      <button disabled={busy} className="btn-primary w-fit">{busy ? "Saving…" : "Change password"}</button>
    </form>
  );
}
