"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/server/members";

export default function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(fd: FormData) {
    setErr("");
    setBusy(true);
    try {
      await acceptInvite(token, {
        displayName: String(fd.get("displayName") ?? ""),
        password: String(fd.get("password") ?? ""),
      });
      r.push("/login");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to accept invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="grid gap-3">
      <div>
        <label className="label">Email</label>
        <input value={email} readOnly className="input bg-ink-50 dark:bg-white/5" />
      </div>
      <div>
        <label className="label">Your name</label>
        <input name="displayName" placeholder="Full name" className="input" />
      </div>
      <div>
        <label className="label">Choose a password (min 8 characters)</label>
        <input name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      {err && <p className="field-err">{err}</p>}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Creating account…" : "Accept invite & create account"}
      </button>
    </form>
  );
}
