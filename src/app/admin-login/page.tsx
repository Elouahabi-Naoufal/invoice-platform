import { Suspense } from "react";
import AdminLoginForm from "@/components/AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
      <div className="w-full max-w-[380px]">
        <div className="card p-8">
          <div className="mb-4 flex items-center gap-2.5">
            <img src="/invora-mark.png" alt="" className="h-9 w-9" />
            <span className="text-xl font-semibold tracking-tight">Invora</span>
          </div>
          <h1 className="page-title mb-1">Admin</h1>
          <p className="meta mb-6">Sign in to manage registrations.</p>
          <Suspense fallback={<div className="h-20" />}><AdminLoginForm /></Suspense>
        </div>
        <p className="mt-4 text-center text-[12px] text-ink-400">
          <a href="/login" className="hover:text-ink-700">User sign in</a>
        </p>
      </div>
    </div>
  );
}