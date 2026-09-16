"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
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
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
      <div className="w-full max-w-[400px]">
        <div className="card p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-white shadow-sm">
              <Receipt size={20} />
            </span>
            <span className="text-xl font-semibold tracking-tight">Invora</span>
          </div>
          <h1 className="page-title mb-1">{mode === "login" ? "Sign in" : "Create admin account"}</h1>
          <p className="meta mb-6">
            {mode === "login" ? "Welcome back — sign in to manage your invoices." : singleUserClosed ? "Single-user mode: registration is closed. Please sign in." : "First run — this creates the owner account."}
          </p>
          <form action={submit} className="grid gap-4">
            {mode === "register" && !singleUserClosed && (
              <div><label className="label" htmlFor="dn">Display name</label><input id="dn" name="displayName" autoComplete="name" className="input" placeholder="Admin" /></div>
            )}
            <div><label className="label" htmlFor="em">Email</label><input id="em" name="email" type="email" required autoComplete="email" placeholder="you@company.ma" className="input" /></div>
            <div><label className="label" htmlFor="pw">Password</label><input id="pw" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••" className="input" /></div>
            {err && <p className="field-err" role="alert">{err}</p>}
            <button type="submit" disabled={busy} className="btn-accent mt-1 w-full">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          <p className="meta mt-5 text-center">
            {mode === "login" ? <a href="/login/register" className="font-medium text-brand-600 hover:text-brand-700">Create the owner account</a> : <a href="/login" className="font-medium text-brand-600 hover:text-brand-700">Back to sign in</a>}
          </p>
        </div>
        <p className="meta mt-4 text-center">Moroccan invoicing · art. 145 CGI ready</p>
      </div>
    </div>
  );
}
