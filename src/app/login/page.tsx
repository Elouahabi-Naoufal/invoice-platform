import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (process.env.APP_MODE === "hub") {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
        <div className="card max-w-md p-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2.5">
            <img src="/invora-mark.png" alt="Invora" className="h-9 w-9" />
            <span className="text-xl font-semibold tracking-tight">Invora Hub</span>
          </div>
          <p className="meta mb-6">This is the Invora management hub. If you already have an account, access your invoicing app at your subdomain (e.g. yourbusiness.invora.app).</p>
          <Link href="/register" className="btn-accent">Register a new account</Link>
          <Link href="/admin/login" className="btn-outline ml-2">Admin sign in</Link>
        </div>
      </div>
    );
  }
  const count = await prisma.user.count().catch(() => 0);
  return <LoginForm mode="login" singleUserClosed={count > 0} />;
}
