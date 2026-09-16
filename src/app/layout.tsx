import { Outfit } from "next/font/google";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import Sidebar from "@/components/Sidebar";
import CompanySwitcher from "@/components/CompanySwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import LocaleToggle from "@/components/LocaleToggle";
import { Toaster } from "@/components/ui";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

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
  // Members act on the owner's data; resolve the effective tenancy boundary.
  let ownerId: string | null = user?.id ?? null;
  if (user) {
    const member = await prisma.member.findFirst({ where: { userId: user.id, revokedAt: null }, select: { ownerId: true } });
    if (member) ownerId = member.ownerId;
  }
  const companies = ownerId
    ? await prisma.company.findMany({ where: { ownerId, archived: false }, orderBy: { createdAt: "asc" } })
    : [];
  const activeId = (await cookies()).get("ip_company")?.value ?? null;

  async function signOut() {
    "use server";
    const { logout } = await import("@/server/auth");
    await logout();
    redirect("/login");
  }

  const locale = (await cookies()).get("ip_locale")?.value ?? "fr";
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir} className={outfit.variable}>
      <body className="font-sans">
        <Toaster>
          {user ? (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 px-6 py-3 backdrop-blur dark:border-white/10 dark:bg-[#101828]/90">
                  <div className="ml-auto flex items-center gap-2.5">
                    <LocaleToggle current={locale} />
                    <ThemeToggle />
                    <CompanySwitcher companies={companies} activeId={activeId} />
                    <form action={signOut} className="flex items-center gap-2.5 border-l border-ink-200 pl-2.5 dark:border-white/10">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        {user.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="leading-tight">
                        <span className="block text-sm font-medium text-ink-950 dark:text-white">{user.displayName}</span>
                        <button className="meta hover:text-error-600">Logout</button>
                      </span>
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
