import { Suspense } from "react";
import AdminLoginForm from "@/components/AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0c111d] p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/invora-mark.png" alt="" className="h-9 w-9" />
          <span className="text-lg font-semibold tracking-tight">Invora</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-[28px] font-semibold leading-tight tracking-tight">Platform console</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-white/60">
            Review registrations, provision isolated workspaces, and support every business from one place.
          </p>
          <ul className="mt-6 grid gap-2 text-[13px] text-white/70">
            <li>• Approve and provision tenants end-to-end</li>
            <li>• WhatsApp + email notifications built in</li>
            <li>• Read-only support sessions, fully audited</li>
          </ul>
        </div>
        <p className="relative text-[12px] text-white/40">© {new Date().getFullYear()} Orbit Labs</p>
      </div>

      {/* Form panel */}
      <div className="grid place-items-center bg-ink-50 px-5 dark:bg-[#101828]">
        <div className="w-full max-w-[360px]">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/invora-mark.png" alt="" className="h-9 w-9" />
            <span className="text-xl font-semibold tracking-tight">Invora</span>
          </div>
          <h1 className="page-title mb-1">Admin sign in</h1>
          <p className="meta mb-6">Manage the platform and its tenants.</p>
          <Suspense fallback={<div className="h-40" />}>
            <AdminLoginForm />
          </Suspense>
          <p className="meta mt-6 text-center">
            <a href="/login" className="font-medium text-brand-600 hover:text-brand-700">Business sign in</a>
            {" · "}
            <a href="/" className="font-medium text-brand-600 hover:text-brand-700">Home</a>
          </p>
        </div>
      </div>
    </div>
  );
}