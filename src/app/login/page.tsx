import LoginForm from "@/components/LoginForm";
import WorkspaceLookupForm from "@/components/WorkspaceLookupForm";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isAdmin, lookupSignIn } from "@/server/role";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (isAdmin()) redirect("/admin");

  if (lookupSignIn()) {
    return (
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0c111d] p-12 text-white lg:flex">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/invora-mark.png" alt="" className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight">Invora</span>
          </div>
          <div className="relative max-w-md">
            <h2 className="text-[28px] font-semibold leading-tight tracking-tight">Sign in to your workspace</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/60">
              Enter your email and we&apos;ll take you to your business workspace.
            </p>
          </div>
          <p className="relative text-[12px] text-white/40">© {new Date().getFullYear()} Orbit Labs</p>
        </div>
        <div className="grid place-items-center bg-ink-50 px-5 dark:bg-[#101828]">
          <div className="w-full max-w-[380px]">
            <div className="mb-6 flex items-center gap-2.5 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/invora-mark.png" alt="" className="h-9 w-9" />
              <span className="text-xl font-semibold tracking-tight">Invora</span>
            </div>
            <h1 className="page-title mb-1">Sign in</h1>
            <p className="meta mb-6">Find the workspace for your email.</p>
            <WorkspaceLookupForm />
            <p className="meta mt-6 text-center">
              <a href="/register" className="font-medium text-brand-600 hover:text-brand-700">Register a new business</a>
              {" · "}
              <a href="/admin-login" className="font-medium text-brand-600 hover:text-brand-700">Admin</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const count = await prisma.user.count().catch(() => 0);
  return <LoginForm mode="login" singleUserClosed={count > 0} />;
}