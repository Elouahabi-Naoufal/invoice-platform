"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompany, updateCompany } from "@/server/companies-clients";

type C = Record<string, string | number | undefined | null>;

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 4, fontSize: 13 }}><span><strong>{label}</strong></span>{children}</label>;
}
const inp = { padding: 8, border: "1px solid #ccc", borderRadius: 6, width: "100%" } as const;

export default function CompanyForm({ initial }: { initial?: C }) {
  const r = useRouter();
  const [err, setErr] = useState("");
  async function submit(f: FormData) {
    setErr("");
    const obj: Record<string, string> = {};
    f.forEach((v, k) => { obj[k] = String(v); });
    const data = {
      ...obj,
      capitalSocial: obj.capitalSocial ? Math.round(Number(obj.capitalSocial) * 100) : undefined,
      defaultTaxBps: Number(obj.defaultTaxBps ?? 2000),
    };
    try {
      if (initial?.id) await updateCompany(String(initial.id), data);
      else await createCompany(data);
      r.push("/companies");
      r.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    }
  }
  const v = (k: string) => (initial?.[k] as string) ?? "";
  return (
    <form action={submit} style={{ display: "grid", gap: 16, background: "#fff", padding: 20, borderRadius: 8 }}>
      <h3>Identité</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <F label="Raison sociale *"><input name="legalName" required defaultValue={v("legalName")} style={inp} /></F>
        <F label="Nom commercial"><input name="tradeName" defaultValue={v("tradeName")} style={inp} /></F>
        <F label="Adresse siège *"><input name="address" required defaultValue={v("address")} style={inp} /></F>
        <F label="Ville"><input name="city" defaultValue={v("city")} style={inp} /></F>
        <F label="Forme juridique (SARL, SA, AE…)"><input name="legalForm" defaultValue={v("legalForm")} style={inp} /></F>
        <F label="Capital social (MAD)"><input name="capitalSocial" type="number" step="0.01" defaultValue={initial?.capitalSocial ? Number(initial.capitalSocial) / 100 : ""} style={inp} /></F>
      </div>
      <h3>Mentions légales (art. 145)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <F label="ICE — 15 chiffres *"><input name="ice" pattern="\d{15}" defaultValue={v("ice")} style={inp} /></F>
        <F label="IF *"><input name="identifiantFiscal" defaultValue={v("identifiantFiscal")} style={inp} /></F>
        <F label="TP / Patente *"><input name="patente" defaultValue={v("patente")} style={inp} /></F>
        <F label="RC"><input name="rc" defaultValue={v("rc")} style={inp} /></F>
        <F label="Ville RC"><input name="rcCity" defaultValue={v("rcCity")} style={inp} /></F>
        <F label="CNSS"><input name="cnss" defaultValue={v("cnss")} style={inp} /></F>
        <F label="Régime fiscal">
          <select name="taxRegime" defaultValue={v("taxRegime") || "COMMUN"} style={inp}>
            <option value="COMMUN">Commun (TVA)</option>
            <option value="AE_HORS_CHAMP">Auto-entrepreneur hors champ (art. 91-II-3°)</option>
            <option value="EXONERE_ART92">Exonéré (art. 92)</option>
          </select>
        </F>
      </div>
      <h3>Contact</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <F label="Téléphone"><input name="phone" defaultValue={v("phone")} style={inp} /></F>
        <F label="Email"><input name="email" defaultValue={v("email")} style={inp} /></F>
      </div>
      <h3>TVA & devise</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <F label="Devise défaut">
          <select name="defaultCurrency" defaultValue={v("defaultCurrency") || "MAD"} style={inp}>
            <option>MAD</option><option>EUR</option><option>USD</option><option>GBP</option>
          </select>
        </F>
        <F label="TVA défaut (bps, 2000=20%)"><input name="defaultTaxBps" type="number" defaultValue={v("defaultTaxBps") || 2000} style={inp} /></F>
        <F label="Langue facture"><input name="invoiceLocale" defaultValue={v("invoiceLocale") || "fr"} style={inp} /></F>
        <F label="Préfixe factures"><input name="invoicePrefix" defaultValue={v("invoicePrefix") || "FAC"} style={inp} /></F>
        <F label="Préfixe avoirs"><input name="avoirPrefix" defaultValue={v("avoirPrefix") || "AV"} style={inp} /></F>
      </div>
      <h3>Banque</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <F label="Banque"><input name="bankName" defaultValue={v("bankName")} style={inp} /></F>
        <F label="Titulaire"><input name="accountHolder" defaultValue={v("accountHolder")} style={inp} /></F>
        <F label="RIB"><input name="rib" defaultValue={v("rib")} style={inp} /></F>
        <F label="IBAN"><input name="iban" defaultValue={v("iban")} style={inp} /></F>
        <F label="SWIFT"><input name="swift" defaultValue={v("swift")} style={inp} /></F>
        <F label="Notes pied de page"><input name="footerNotes" defaultValue={v("footerNotes")} style={inp} /></F>
      </div>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <button type="submit" style={{ padding: 10 }}>Enregistrer (validation Zod côté serveur)</button>
    </form>
  );
}
