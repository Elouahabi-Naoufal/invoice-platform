import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";

export default async function SettingsPage() {
  try { await requireUser(); } catch { redirect("/login"); }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1>Réglages</h1>
      <div style={{ background: "#fff", padding: 14, borderRadius: 8 }}>
        <h3>Email (SMTP)</h3>
        <p style={{ fontSize: 13 }}>Configurez <code>SMTP_HOST/PORT/USER/PASS/FROM</code> dans <code>.env</code>. Sans SMTP, l&apos;envoi échoue explicitement — la facture n&apos;est jamais marquée « envoyée » sur un échec provider.</p>
      </div>
      <div style={{ background: "#fff", padding: 14, borderRadius: 8 }}>
        <h3>Conservation</h3>
        <p style={{ fontSize: 13 }}>10 ans (art. 211 CGI). Ne supprimez jamais la base sans export. Les factures émises/annulées sont inaltérables et gardent leur numéro.</p>
      </div>
    </div>
  );
}
