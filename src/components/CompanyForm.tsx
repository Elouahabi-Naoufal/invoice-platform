"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompany, updateCompany } from "@/server/companies-clients";
import { useToast, Modal } from "@/components/ui";

type C = Record<string, string | number | undefined | null>;

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="section-title mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">{children}</div>
    </section>
  );
}

export function CompanyFormFields({ initial }: { initial?: C }) {
  const v = (k: string) => (initial?.[k] as string) ?? "";
  return (
    <div className="grid gap-6">
      <Section title="Business identity">
        <F label="Legal name *"><input name="legalName" required minLength={2} defaultValue={v("legalName")} className="input" /></F>
        <F label="Trade name"><input name="tradeName" defaultValue={v("tradeName")} className="input" /></F>
        <F label="Registered address *"><input name="address" required minLength={3} defaultValue={v("address")} className="input" /></F>
        <F label="City"><input name="city" defaultValue={v("city")} className="input" /></F>
        <F label="Legal form"><input name="legalForm" placeholder="SARL, SA, AE…" defaultValue={v("legalForm")} className="input" /></F>
        <F label="Share capital (MAD)"><input name="capitalSocial" type="number" step="0.01" min={0} defaultValue={initial?.capitalSocial ? Number(initial.capitalSocial) / 100 : ""} className="input" /></F>
      </Section>
      <Section title="Legal identifiers · art. 145 CGI">
        <F label="ICE — 15 digits" hint="Required to finalize invoices. Mod97-checked."><input name="ice" pattern="\d{15}" defaultValue={v("ice")} className="input tabular-nums" /></F>
        <F label="Identifiant Fiscal (IF)" hint="Required to finalize."><input name="identifiantFiscal" defaultValue={v("identifiantFiscal")} className="input" /></F>
        <F label="Taxe Professionnelle (TP)" hint="Required to finalize, even during exemption."><input name="patente" defaultValue={v("patente")} className="input" /></F>
        <F label="Registre de Commerce (RC)"><input name="rc" defaultValue={v("rc")} className="input" /></F>
        <F label="RC city"><input name="rcCity" defaultValue={v("rcCity")} className="input" /></F>
        <F label="CNSS"><input name="cnss" defaultValue={v("cnss")} className="input" /></F>
        <F label="Tax regime">
          <select name="taxRegime" defaultValue={v("taxRegime") || "COMMUN"} className="input">
            <option value="COMMUN">Standard (with TVA)</option>
            <option value="AE_HORS_CHAMP">Auto-entrepreneur, out of scope (art. 91-II-3°)</option>
            <option value="EXONERE_ART92">Exempt (art. 92)</option>
          </select>
        </F>
      </Section>
      <Section title="Contact">
        <F label="Phone"><input name="phone" defaultValue={v("phone")} className="input" /></F>
        <F label="Email"><input name="email" type="email" defaultValue={v("email")} className="input" /></F>
      </Section>
      <Section title="Invoice defaults">
        <F label="Default currency">
          <select name="defaultCurrency" defaultValue={v("defaultCurrency") || "MAD"} className="input"><option>MAD</option><option>EUR</option><option>USD</option><option>GBP</option></select>
        </F>
        <F label="Default TVA (bps)" hint="2000 = 20%"><input name="defaultTaxBps" type="number" defaultValue={v("defaultTaxBps") || 2000} className="input" /></F>
        <F label="Invoice prefix"><input name="invoicePrefix" defaultValue={v("invoicePrefix") || "FAC"} className="input" /></F>
        <F label="Credit-note prefix"><input name="avoirPrefix" defaultValue={v("avoirPrefix") || "AV"} className="input" /></F>
        <F label="Invoice language"><input name="invoiceLocale" defaultValue={v("invoiceLocale") || "fr"} className="input" /></F>
      </Section>
      <Section title="Bank">
        <F label="Bank"><input name="bankName" defaultValue={v("bankName")} className="input" /></F>
        <F label="Account holder"><input name="accountHolder" defaultValue={v("accountHolder")} className="input" /></F>
        <F label="RIB"><input name="rib" defaultValue={v("rib")} className="input tabular-nums" /></F>
        <F label="IBAN"><input name="iban" defaultValue={v("iban")} className="input tabular-nums" /></F>
        <F label="SWIFT / BIC"><input name="swift" defaultValue={v("swift")} className="input" /></F>
        <F label="Footer notes"><input name="footerNotes" defaultValue={v("footerNotes")} className="input" /></F>
      </Section>
    </div>
  );
}

export default function CompanyForm({ initial, onDone }: { initial?: C; onDone?: () => void }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(f: FormData) {
    setErr(""); setSaving(true);
    const obj: Record<string, string> = {};
    f.forEach((v, k) => { obj[k] = String(v); });
    const data = {
      ...obj,
      capitalSocial: obj.capitalSocial ? Math.round(Number(obj.capitalSocial) * 100) : undefined,
      defaultTaxBps: Number(obj.defaultTaxBps ?? 2000),
    };
    try {
      if (initial?.id) { await updateCompany(String(initial.id), data); toast({ kind: "ok", title: "Company updated" }); }
      else { await createCompany(data); toast({ kind: "ok", title: "Company created" }); }
      if (onDone) onDone();
      else { r.push("/companies"); r.refresh(); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setErr(msg);
      toast({ kind: "err", title: "Unable to save company", body: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={submit} className="card p-6">
      <CompanyFormFields initial={initial} />
      {err && <p className="field-err mt-4">{err}</p>}
      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save company"}</button>
      </div>
    </form>
  );
}

export function CompanyModal({ initial, onClose }: { initial?: C; onClose: () => void }) {
  return (
    <Modal title={initial ? "Edit company" : "New company"} onClose={onClose} wide>
      <CompanyForm initial={initial} onDone={onClose} />
    </Modal>
  );
}
