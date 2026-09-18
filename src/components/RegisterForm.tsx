"use client";
import { useState } from "react";
import { registerTenant } from "@/server/admin-actions";

export default function RegisterForm() {
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [slug, setSlug] = useState("");

  async function submit(f: FormData) {
    setErr("");
    const res = await registerTenant({
      name: String(f.get("name") ?? ""),
      email: String(f.get("email") ?? ""),
      phone: String(f.get("phone") ?? ""),
      companyName: String(f.get("companyName") ?? ""),
      requestedSlug: slug,
    });
    if (res?.error) setErr(res.error);
    else setDone(true);
  }

  if (done) return (
    <div className="card max-w-md p-8 mx-auto mt-10 text-center">
      <h1 className="page-title mb-2">Registration submitted</h1>
      <p className="meta">Your account is pending approval. You will be notified once it is ready.</p>
    </div>
  );

  return (
    <form action={submit} className="grid gap-4">
      <div><label className="label">Full name *</label><input name="name" required className="input" /></div>
      <div><label className="label">Email *</label><input name="email" type="email" required className="input" /></div>
      <div><label className="label">Phone</label><input name="phone" type="tel" className="input" placeholder="+212 6XX XXX XXX" /></div>
      <div><label className="label">Company name *</label><input name="companyName" required className="input" /></div>
      <div>
        <label className="label">Requested slug *</label>
        <input
          name="requestedSlug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          className="input"
          placeholder="my-company"
        />
        <p className="mt-1 text-[12px] text-ink-400">Lowercase letters, numbers and hyphens only.</p>
      </div>
      {err && <p className="field-err">{err}</p>}
      <button type="submit" className="btn-accent">Submit registration</button>
    </form>
  );
}