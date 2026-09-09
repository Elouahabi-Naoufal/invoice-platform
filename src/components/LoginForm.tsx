"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/server/auth";

export default function LoginForm({ mode, singleUserClosed }: { mode: "login" | "register"; singleUserClosed: boolean }) {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(f: FormData) {
    setErr(""); setBusy(true);
    try {
      if (mode === "login") await login(String(f.get("email")), String(f.get("password")));
      else await register({ email: String(f.get("email")), password: String(f.get("password")), displayName: String(f.get("displayName") || "Admin") });
      r.push("/");
      r.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-950 text-sm font-bold text-white">F</span>
          <span className="text-[15px] font-semibold tracking-tight">Facturo</span>
        </div>
        <h1 className="page-title mb-1">{mode === "login" ? "Welcome back" : "Create admin account"}</h1>
        <p className="mb-6 text-[13px] text-ink-500 dark:text-stone-400">
          {mode === "login" ? "Sign in to manage your invoices." : singleUserClosed ? "Single-user mode: registration is closed. Please sign in." : "First run — this creates the owner account."}
        </p>
        <form action={submit} className="grid gap-3">
          {mode === "register" && !singleUserClosed && (
            <div><label className="label" htmlFor="dn">Display name</label><input id="dn" name="displayName" autoComplete="name" className="input" /></div>
          )}
          <div><label className="label" htmlFor="em">Email</label><input id="em" name="email" type="email" required autoComplete="email" className="input" /></div>
          <div><label className="label" htmlFor="pw">Password</label><input id="pw" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className="input" /></div>
          {err && <p className="field-err" role="alert">{err}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-1 w-full">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="mt-4 text-center text-[13px] text-ink-500 dark:text-stone-400">
          {mode === "login" ? <a href="/login/register" className="text-brand-600 hover:underline">Create the owner account</a> : <a href="/login" className="text-brand-600 hover:underline">Back to sign in</a>}
        </p>
      </div>
    </div>
  );
}
