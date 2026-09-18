"use client";
import { useSearchParams } from "next/navigation";
import { adminLogin } from "@/server/admin-auth";

export default function AdminLoginForm() {
  const sp = useSearchParams();
  const err = sp.get("error");
  return (
    <form action={adminLogin} className="grid gap-4">
      <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
      <div><label className="label">Password</label><input name="password" type="password" required minLength={8} className="input" /></div>
      {err && <p className="field-err">{err.replace(/[+]/g, " ")}</p>}
      <button type="submit" className="btn-accent w-full">Sign in</button>
    </form>
  );
}