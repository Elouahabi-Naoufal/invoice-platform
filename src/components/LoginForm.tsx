"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/server/auth";

export default function LoginForm({ mode, singleUserClosed }: { mode: "login" | "register"; singleUserClosed: boolean }) {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const closed = mode === "register" && singleUserClosed;

  async function submit(f: FormData) {
    setErr(""); setBusy(true);
    try {
      const res = mode === "login"
        ? await login(String(f.get("email")), String(f.get("password")))
        : await register({ email: String(f.get("email")), password: String(f.get("password")), displayName: String(f.get("displayName") || "Admin") });
      if (res?.error) { setErr(res.error); return; }
      r.push("/");
      r.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
      <div className="w-full max-w-[400px]">
        <div className="card p-8">
          <div className="mb-6 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/invora-mark.png" alt="Invora" className="h-9 w-9" />
            <span className="text-xl font-semibold tracking-tight">Invora</span>
          </div>
          {closed ? (
            <>
              <h1 className="page-title mb-1">Registration closed</h1>
              <p className="meta mb-6">This instance already has an owner account. Sign in to continue, or register a new business at the registration page.</p>
              <div className="flex flex-col gap-2">
                <a href="/login" className="btn-accent w-full text-center">Sign in</a>
                <a href="/register" className="btn-outline w-full text-center">Register a new business</a>
              </div>
            </>
          ) : (
            <>
              <h1 className="page-title mb-1">{mode === "login" ? "Sign in" : "Create admin account"}</h1>
              <p className="meta mb-6">
                {mode === "login" ? "Welcome back — sign in to manage your invoices." : "First run — this creates the owner account."}
              </p>
              <form action={submit} className="grid gap-4">
                {mode === "register" && (
                  <div><label className="label" htmlFor="dn">Display name</label><input id="dn" name="displayName" autoComplete="name" className="input" placeholder="Admin" /></div>
                )}
                <div><label className="label" htmlFor="em">Email</label><input id="em" name="email" type="email" required autoComplete="email" placeholder="you@company.ma" className="input" /></div>
                <div><label className="label" htmlFor="pw">Password</label><input id="pw" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••" className="input" /></div>
                {err && <p className="field-err" role="alert">{err}</p>}
                <button type="submit" disabled={busy} className="btn-accent mt-1 w-full">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
              </form>
            </>
          )}
          <p className="meta mt-5 text-center">
            {mode === "login" ? <a href="/register" className="font-medium text-brand-600 hover:text-brand-700">Register a new business</a> : <a href="/login" className="font-medium text-brand-600 hover:text-brand-700">Back to sign in</a>}
          </p>
        </div>
        <p className="mt-4 text-center text-[12px] text-ink-400">
          <a href="/home" className="hover:text-ink-700 dark:hover:text-gray-200">Home</a>
          {" · "}
          <a href="/privacy" className="hover:text-ink-700 dark:hover:text-gray-200">Privacy policy</a>
          {" · "}
          <a href="/terms" className="hover:text-ink-700 dark:hover:text-gray-200">Terms of service</a>
        </p>
      </div>
    </div>
  );
}
