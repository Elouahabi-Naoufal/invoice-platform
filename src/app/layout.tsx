import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

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

const NAV = [
  ["/", "Dashboard"],
  ["/invoices", "Factures"],
  ["/invoices/new", "+ Nouvelle"],
  ["/companies", "Sociétés"],
  ["/clients", "Clients"],
  ["/settings", "Réglages"],
] as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await sessionUser();
  const companies = user ? await prisma.company.findMany({ where: { ownerId: user.id, archived: false }, orderBy: { createdAt: "asc" } }) : [];
  const activeId = (await cookies()).get("ip_company")?.value ?? null;
  const active = companies.find((c) => c.id === activeId) ?? companies[0] ?? null;

  async function switchCompany(form: FormData) {
    "use server";
    const { setActiveCompany } = await import("@/server/auth");
    await setActiveCompany(String(form.get("id")));
    redirect("/");
  }
  async function signOut() {
    "use server";
    const { logout } = await import("@/server/auth");
    await logout();
    redirect("/login");
  }

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui,sans-serif", margin: 0, background: "#f4f4f1", color: "#111" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <aside style={{ width: 210, background: "#111", color: "#fff", padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ marginBottom: 12 }}>Invoice · v1</strong>
            {user && NAV.map(([href, label]) => (
              <Link key={href} href={href} style={{ color: "#ddd", textDecoration: "none", padding: "8px 10px", borderRadius: 6 }}>{label}</Link>
            ))}
            <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.7 }}>{user ? user.email : "non connecté"}</div>
            {user && (
              <form action={signOut}><button style={{ marginTop: 8, width: "100%" }}>Déconnexion</button></form>
            )}
          </aside>
          <div style={{ flex: 1 }}>
            {user && (
              <header style={{ background: "#fff", borderBottom: "1px solid #e5e5e0", padding: "10px 20px", display: "flex", gap: 12, alignItems: "center" }}>
                <form action={switchCompany} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label>Société active :</label>
                  <select name="id" defaultValue={active?.id ?? ""}>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
                  </select>
                  <button type="submit">Changer</button>
                </form>
                <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.7 }}>
                  {active ? `${active.invoicePrefix} · ${active.defaultCurrency}` : "créez une société"}
                </span>
              </header>
            )}
            <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
