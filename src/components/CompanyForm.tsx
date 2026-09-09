"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCompany, updateCompany, uploadLogo } from "@/server/companies-clients";
import { useToast, Modal } from "@/components/ui";

const ACCENTS = ["#1D4ED8", "#0F766E", "#334155", "#7C2D12", "#581C87", "#0E7490"];

function AccentPicker({ initial }: { initial?: string }) {
  const [val, setVal] = useState(initial || "#1D4ED8");
  return (
    <div>
      <span className="label">Invoice accent color</span>
      <div className="flex items-center gap-2">
        {ACCENTS.map((a) => (
          <button
            key={a} type="button" aria-label={`Accent ${a}`} title={a}
            onClick={() => setVal(a)}
            className={`h-7 w-7 rounded-full border-2 ${val.toUpperCase() === a ? "border-ink-950 dark:border-white" : "border-transparent"}`}
            style={{ backgroundColor: a }}
          />
        ))}
        <input
          type="color" value={/^#[0-9A-Fa-f]{6}$/.test(val) ? val : "#1D4ED8"}
          onChange={(e) => setVal(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-ink-200 bg-transparent p-0.5"
          title="Custom color"
        />
      </div>
      <input type="hidden" name="accentColor" value={val} />
      <p className="hint">Table header, totals and footer bars on your invoices.</p>
    </div>
  );
}

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

function prettyErr(e: unknown): string {
  if (!(e instanceof Error)) return "Save failed";
  try {
    const issues = JSON.parse(e.message) as { path: (string | number)[]; message: string }[];
    if (Array.isArray(issues)) {
      return issues.map((i) => `${(i.path || []).join(".") || "form"}: ${i.message}`).join(" · ");
    }
  } catch { /* plain message */ }
  return e.message;
}

export function CompanyFormFields({ initial }: { initial?: C }) {
  const v = (k: string) => (initial?.[k] as string) ?? "";
  return (
    <div className="grid gap-6">
      <Section title="Business identity">
        <div className="col-span-2 flex items-center gap-4">
          {(initial?.logoPath as string) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={initial?.logoPath as string} alt="Company logo" className="h-12 w-12 rounded-md border border-ink-200 dark:border-white/10 object-contain" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-md bg-ink-950 text-lg font-semibold text-white">
              {(v("legalName") || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <span className="label">Logo (PNG/JPEG/WebP, ≤ 6 MB — auto-converted for PDF)</span>
            <LogoInput companyId={(initial?.id as string | undefined)} />
          </div>
        </div>
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
        <div className="col-span-2"><AccentPicker initial={v("accentColor")} /></div>
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

function LogoInput({ companyId }: { companyId?: string }) {
  const toast = useToast();
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  if (!companyId) return <p className="hint">Save the company first, then add a logo.</p>;
  return (
    <span className="flex items-center gap-2">
      <input
        ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            const fd = new FormData();
            fd.set("logo", f);
            await uploadLogo(companyId, fd);
            toast({ kind: "ok", title: "Logo updated" });
            r.refresh();
          } catch (err) {
            toast({ kind: "err", title: "Logo upload failed", body: err instanceof Error ? err.message : undefined });
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-outline btn-sm">
        {busy ? "Uploading…" : "Upload logo"}
      </button>
    </span>
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
      // Surface WHICH field failed (native validation is disabled below so nothing blocks silently)
      const msg = prettyErr(e);
      setErr(msg);
      toast({ kind: "err", title: "Unable to save company", body: msg.slice(0, 300) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={submit} noValidate className="card p-6">
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
