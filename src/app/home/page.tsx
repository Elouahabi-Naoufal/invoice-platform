import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import PublicFooter from "@/components/PublicFooter";

async function isLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get("ip_session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return true;
  } catch {
    return false;
  }
}

export const metadata = {
  title: "Invora — invoicing & finance for Moroccan businesses",
  description: "Create invoices and quotes, track payments, send by email or WhatsApp, and report on your finances.",
};

export default async function HomePage() {
  if (await isLoggedIn()) redirect("/");

  const features = [
    ["Invoices & quotes", "Factures, devis, avoirs and rectificatives with gapless per-company numbering."],
    ["Payments", "Record full or partial payments and track outstanding and overdue balances."],
    ["Send anywhere", "Email through your own mailbox or Gmail, or send PDFs over WhatsApp."],
    ["Reports", "TVA summary, aged receivables, revenue by client and product."],
    ["Multi-company", "Several legal entities, each with its own ICE, prefixes and bank details."],
    ["Morocco-ready", "ICE, IF, RC, patente, TVA rates and art. 145 CGI mentions built in."],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/invora-mark.png" alt="Invora" className="h-10 w-10" />
        <span className="text-2xl font-semibold tracking-tight">Invora</span>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Invoicing and finance for Moroccan businesses</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-ink-500 dark:text-gray-400">
        Invora helps you issue compliant invoices, send them to your clients, follow what has been paid,
        and report on your activity — in one place.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/login" className="btn-primary">Sign in</Link>
        <Link href="/login/register" className="btn-outline">Create the owner account</Link>
      </div>

      <div className="mt-12 grid gap-3 sm:grid-cols-2">
        {features.map(([title, body]) => (
          <div key={title} className="card p-4">
            <div className="text-[14px] font-semibold">{title}</div>
            <p className="meta mt-1">{body}</p>
          </div>
        ))}
      </div>

      <PublicFooter />
    </div>
  );
}
