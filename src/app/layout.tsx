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
                <header
                  className="sticky top-0 z-30 flex items-center gap-3 px-6 py-2.5"
                  style={{
                    background: "linear-gradient(to bottom, #5b9bd5 0%, #3a8bd2 48%, #2273b8 52%, #2b6cb8 100%)",
                    borderBottom: "1px solid #17578f",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 5px rgba(20,40,70,0.35)",
                  }}
                >
                  <div className="ml-auto flex items-center gap-3">
                    <CompanySwitcher companies={companies} activeId={activeId} />
                    <form action={signOut}>
                      <button
                        className="btn-sm rounded-md px-2.5 py-1.5 text-xs font-bold text-white"
                        style={{ textShadow: "0 1px 1px rgba(0,0,0,0.5)" }}
                        title={user.email}
                      >
                        {user.displayName} · Logout
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
