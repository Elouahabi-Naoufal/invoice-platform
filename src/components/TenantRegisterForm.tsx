"use client";
import { useState } from "react";
import { registerTenant } from "@/server/hub-tenants";

export default function TenantRegisterForm() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(f: FormData) {
    setErr(""); setBusy(true);
    try {
      await registerTenant({
        email: String(f.get("email")),
        phone: String(f.get("phone")),
        companyName: String(f.get("companyName")),
        subdomain: String(f.get("subdomain")),
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registration failed");
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
        <div className="card max-w-md p-8 text-center">
          <h1 className="page-title mb-2">Registration submitted</h1>
          <p className="meta">Your account is pending approval. You will be notified once it is ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
      <div className="w-full max-w-[420px]">
        <div className="card p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <img src="/invora-mark.png" alt="Invora" className="h-9 w-9" />
            <span className="text-xl font-semibold tracking-tight">Invora</span>
          </div>
          <h1 className="page-title mb-1">Get started</h1>
          <p className="meta mb-6">Register your business — you will receive access once approved.</p>
          <form action={submit} className="grid gap-4">
            <div><label className="label">Email *</label><input name="email" type="email" required className="input" /></div>
            <div><label className="label">Phone</label><input name="phone" type="tel" className="input" placeholder="+212 6XX XXX XXX" /></div>
            <div><label className="label">Company name *</label><input name="companyName" required className="input" placeholder="My Business SARL" /></div>
            <div><label className="label">Desired subdomain *</label>
              <div className="flex items-center gap-1">
                <input name="subdomain" required pattern="[a-z0-9-]+" className="input flex-1" placeholder="mybusiness" />
                <span className="text-ink-400 text-[13px] shrink-0">.invora.app</span>
              </div>
              <p className="field-hint">Letters, numbers and hyphens only.</p>
            </div>
            {err && <p className="field-err">{err}</p>}
            <button type="submit" disabled={busy} className="btn-accent w-full">{busy ? "Please wait…" : "Submit registration"}</button>
          </form>
          <p className="meta mt-5 text-center">
            <a href="/login" className="font-medium text-brand-600 hover:text-brand-700">Already have an account? Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}