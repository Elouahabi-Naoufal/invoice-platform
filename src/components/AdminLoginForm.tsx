"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/server/hub-auth";

export default function AdminLoginForm() {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(f: FormData) {
    setErr(""); setBusy(true);
    try {
      await adminLogin(String(f.get("email")), String(f.get("password")));
      r.push("/admin");
      r.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally { setBusy(false); }
  }
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
      <div className="w-full max-w-[380px]">
        <div className="card p-8">
          <h1 className="page-title mb-1">Admin</h1>
          <p className="meta mb-6">Sign in to manage all tenants.</p>
          <form action={submit} className="grid gap-4">
            <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
            <div><label className="label">Password</label><input name="password" type="password" required minLength={8} className="input" /></div>
            {err && <p className="field-err">{err}</p>}
            <button type="submit" disabled={busy} className="btn-accent w-full">{busy ? "Please wait…" : "Sign in"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}