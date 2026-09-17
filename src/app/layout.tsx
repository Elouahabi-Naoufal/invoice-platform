import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import { Toaster } from "@/components/ui";
import { publicUploadUrl } from "@/lib/uploads";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  title: "Invora",
  description: "Invoicing and finance for Moroccan businesses — invoices, quotes, credit notes, payments, reports.",
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

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
  const locale = (await cookies()).get("ip_locale")?.value ?? "fr";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const companyOptions = companies.map((c) => ({
    id: c.id,
    legalName: c.legalName,
    city: c.city,
    defaultCurrency: c.defaultCurrency,
    logoPath: publicUploadUrl(c.logoPath),
  }));

  return (
    <html lang={locale} dir={dir} className={inter.variable}>
      <body className="font-sans">
        <Toaster>
          {user ? (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="min-w-0 flex-1">
                <AppHeader
                  user={{ name: user.displayName, email: user.email }}
                  companies={companyOptions}
                  activeId={activeId}
                  locale={locale}
                />
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
