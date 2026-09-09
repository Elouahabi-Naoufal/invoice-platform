import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import Sidebar from "@/components/Sidebar";
import CompanySwitcher from "@/components/CompanySwitcher";
import { Toaster } from "@/components/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

async function sessionUser() {
  const token = (await cookies()).get("ip_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return prisma.user.findUnique({ where: { id: payload.sub as string } });
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await sessionUser();
  const companies = user
    ? await prisma.company.findMany({ where: { ownerId: user.id, archived: false }, orderBy: { createdAt: "asc" } })
    : [];
  const activeId = (await cookies()).get("ip_company")?.value ?? null;

  async function signOut() {
    "use server";
    const { logout } = await import("@/server/auth");
    await logout();
    redirect("/login");
  }

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <Toaster>
          {user ? (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-200 dark:border-white/10 bg-ink-50 dark:bg-white/5/90 dark:bg-[#121110]/90 px-6 py-3 backdrop-blur">
                  <div className="ml-auto flex items-center gap-3">
                    <CompanySwitcher companies={companies} activeId={activeId} />
                    <form action={signOut}>
                      <button className="btn-ghost btn-sm" title={user.email}>
                        {user.displayName}
                      </button>
                    </form>
                  </div>
                </header>
                <main className="mx-auto max-w-[1200px] px-6 py-7 max-md:px-4">{children}</main>
              </div>
            </div>
          ) : (
            <main>{children}</main>
          )}
        </Toaster>
      </body>
    </html>
  );
}
