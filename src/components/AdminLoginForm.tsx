"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminLogin } from "@/server/hub-auth";

export default function AdminLoginForm() {
  const sp = useSearchParams();
  const err = sp.get("error");
  const [pending, setPending] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
      <div className="w-full max-w-[380px]">
        <div className="card p-8">
          <h1 className="page-title mb-1">Admin</h1>
          <p className="meta mb-6">Sign in to manage all tenants.</p>
          <form action={adminLogin} onSubmit={() => setPending(true)} className="grid gap-4">
            <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
            <div><label className="label">Password</label><input name="password" type="password" required minLength={8} className="input" /></div>
            {err && <p className="field-err">{err.replace(/[+]/g, " ")}</p>}
            <button type="submit" disabled={pending} className="btn-accent w-full">{pending ? "Please wait…" : "Sign in"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}