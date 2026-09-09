"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, Trash2, Copy, GripVertical } from "lucide-react";
import { calcInvoice } from "@/domain/invoice";
import InvoicePreview, { PreviewLine } from "@/components/InvoicePreview";
import ClientForm from "@/components/ClientForm";
import { createDraft, updateDraft } from "@/server/invoice-ops";
import { listClients } from "@/server/companies-clients";
import { useToast, Modal } from "@/components/ui";

type Company = Record<string, string | number | null | undefined> & { id: string; legalName: string };
type Client = { id: string; type: string; name: string; companyName?: string | null; ice?: string | null; address?: string | null; city?: string | null; clientIF?: string | null; clientRC?: string | null };
export type DraftInit = {
  id: string; docType: string; currency: string; issueDate: string; dueDate: string | null;
  paymentTerms: string; paymentMode: string | null; poNumber: string | null; notes: string | null;
  invDiscountBps: number; companyId: string | null; clientId: string | null;
  correctionReason: string | null; linkedInvoiceId: string | null;
  lines: PreviewLine[];
};

const TVA_CHOICES = [
  { label: "20%", v: 2000 }, { label: "14%", v: 1400 }, { label: "10%", v: 1000 },
  { label: "7%", v: 700 }, { label: "0%", v: 0 }, { label: "Exonéré", v: -1 },
];
const UNITS = ["piece", "heure", "jour", "kg", "service"];

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${active ? "bg-ink-950 text-white" : done ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-ink-100 dark:bg-white/10 text-ink-500 dark:text-stone-400"}`}>
      {n}
    </span>
  );
}

export default function InvoiceBuilder({ companies, initialClients, linked, draft }: {
  companies: Company[]; initialClients: Client[];
  linked?: { id: string; number: string | null } | null; draft?: DraftInit | null;
}) {
  const r = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [sellerId, setSellerId] = useState(draft?.companyId ?? companies[0]?.id ?? "");
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [buyerId, setBuyerId] = useState(draft?.clientId ?? "");
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [docType, setDocType] = useState(draft?.docType ?? "FACTURE");
  const [issueDate, setIssueDate] = useState(draft?.issueDate ?? "2026-09-09");
  const [dueDate, setDueDate] = useState(draft?.dueDate ?? "");
  const [currency, setCurrency] = useState(draft?.currency ?? "MAD");
  const [paymentMode, setPaymentMode] = useState(draft?.paymentMode ?? "VIREMENT");
  const [paymentTerms, setPaymentTerms] = useState(draft?.paymentTerms ?? "D30");
  const [poNumber, setPoNumber] = useState(draft?.poNumber ?? "");
  const [correctionReason, setCorrectionReason] = useState(draft?.correctionReason ?? "");
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [invDiscPct, setInvDiscPct] = useState((draft?.invDiscountBps ?? 0) / 100);
  const [lines, setLines] = useState<PreviewLine[]>(draft?.lines ?? [
    { description: "", quantityMilli: 1000, unit: "piece", unitPriceMinor: 0, discountBps: 0, taxRateBps: 2000, taxExempt: false },
  ]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const seller = companies.find((c) => c.id === sellerId);
  const buyer = clients.find((c) => c.id === buyerId);

  const calc = useMemo(() => {
    try { return calcInvoice({ lines, invDiscountBps: Math.round(invDiscPct * 100), invDiscountFixedMinor: 0 }); }
    catch { return null; }
  }, [lines, invDiscPct]);

  async function search() {
    setClients(await listClients(q) as Client[]);
  }

  function setLine(i: number, patch: Partial<PreviewLine>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  function move(i: number, dir: number) {
    setLines((ls) => {
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    setErr(""); setSaving(true);
    try {
      if (!sellerId) throw new Error("Select a seller (step 1).");
      if (!buyerId) throw new Error("Select a buyer (step 2).");
      const badLine = lines.findIndex((l) => !l.description.trim());
      if (lines.length === 0 || badLine >= 0) {
        setTried(true);
        // Focus the first undescribed line so the problem is obvious.
        requestAnimationFrame(() => document.getElementById(`line-desc-${Math.max(0, badLine)}`)?.focus());
        throw new Error(
          lines.length === 0 ? "Add at least one line." : `Line ${badLine + 1} needs a description.`
        );
      }
      const payload = {
        companyId: sellerId, clientId: buyerId, docType,
        linkedInvoiceId: linked?.id ?? draft?.linkedInvoiceId ?? undefined,
        correctionReason: (docType === "AVOIR" || docType === "RECTIFICATIVE") ? correctionReason : undefined,
        currency, invoiceLocale: "fr", issueDate,
        dueDate: dueDate || null,
        paymentTerms, paymentMode, poNumber: poNumber || undefined, notes: notes || undefined,
        invDiscountBps: Math.round(invDiscPct * 100), invDiscountFixedMinor: 0,
        lines: lines.map((l) => ({ ...l })),
      };
      if (draft) {
        await updateDraft(draft.id, payload);
        toast({ kind: "ok", title: "Draft updated" });
        r.push(`/invoices/${draft.id}`);
      } else {
        const inv = await createDraft(payload);
        toast({ kind: "ok", title: "Draft saved" });
        r.push(`/invoices/${(inv as { id: string }).id}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setErr(msg);
      toast({ kind: "err", title: "Unable to save", body: msg });
    } finally {
      setSaving(false);
    }
  }

  const sellerView = seller ? {
    legalName: String(seller.legalName ?? ""), tradeName: String(seller.tradeName ?? ""),
    address: String(seller.address ?? ""), city: String(seller.city ?? ""),
    ice: String(seller.ice ?? ""), identifiantFiscal: String(seller.identifiantFiscal ?? ""),
    patente: String(seller.patente ?? ""), rc: String(seller.rc ?? ""), rcCity: String(seller.rcCity ?? ""),
    cnss: String(seller.cnss ?? ""), accentColor: String(seller.accentColor ?? "#1D4ED8"),
    logoPath: String(seller.logoPath ?? ""),
  } : {};
  const buyerView = buyer ? {
    name: buyer.name, companyName: buyer.companyName ?? undefined,
    address: buyer.address ?? undefined, city: buyer.city ?? undefined,
    ice: buyer.ice ?? undefined, clientIF: buyer.clientIF ?? undefined, clientRC: buyer.clientRC ?? undefined,
  } : { name: "—" };

  const missingDesc = (i: number) => tried && !lines[i]?.description.trim();

  return (
    <div>
      <div className="mb-5 flex items-center gap-5">
        {[["Seller", 0], ["Buyer", 1], ["Details", 2]].map(([label, i]) => (
          <button key={label as string} onClick={() => setStep(i as number)} className={`flex items-center gap-2 text-[13px] ${step === (i as number) ? "font-semibold text-ink-950 dark:text-stone-100" : "text-ink-400 dark:text-stone-500 hover:text-ink-700 dark:hover:text-stone-200"}`}>
            <StepDot n={(i as number) + 1} active={step === i} done={step > (i as number)} /> {label as string}
          </button>
        ))}
        <select value={docType} onChange={(e) => setDocType(e.target.value)} disabled={!!draft} className="input ml-auto w-auto" aria-label="Document type">
          <option>FACTURE</option><option>AVOIR</option><option>RECTIFICATIVE</option>
        </select>
      </div>

      <div className="flex items-start gap-6 max-xl:flex-col">
        <div className="min-w-0 flex-1">
          {step === 0 && (
            <div className="card flex flex-col gap-2 p-3">
              {companies.map((c) => (
                <button key={c.id} onClick={() => { setSellerId(c.id); setCurrency(String((c as Record<string, unknown>).defaultCurrency ?? "MAD")); setStep(1); }}
                  className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-colors ${sellerId === c.id ? "border-ink-950 dark:border-stone-100 bg-ink-50 dark:bg-white/5" : "border-ink-200 dark:border-white/10 hover:border-ink-400 dark:hover:border-white/30"}`}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink-950 text-sm font-semibold text-white">{String(c.legalName).slice(0, 1)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{String(c.legalName)}</span>
                    <span className="meta block">ICE {String((c as Record<string, unknown>).ice ?? "—")} · {String((c as Record<string, unknown>).defaultCurrency ?? "")}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="card p-4">
              <div className="mb-3 flex gap-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search clients…" className="input" />
                <button onClick={search} className="btn-outline">Search</button>
                <button onClick={() => setShowNew(true)} className="btn-outline whitespace-nowrap"><Plus size={14} /> New client</button>
              </div>
              <div className="flex flex-col gap-1.5">
                {clients.map((c) => (
                  <button key={c.id} onClick={() => { setBuyerId(c.id); setStep(2); }}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${buyerId === c.id ? "border-ink-950 dark:border-stone-100 bg-ink-50 dark:bg-white/5" : "border-transparent hover:border-ink-200 dark:hover:border-white/20 hover:bg-ink-50 dark:hover:bg-white/5"}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{c.companyName || c.name}</span>
                      <span className="meta block">{c.type === "COMPANY" ? `B2B · ICE ${c.ice || "missing"}` : "Particulier"} · {c.city ?? ""}</span>
                    </span>
                  </button>
                ))}
                {clients.length === 0 && <p className="meta px-1 py-3">No clients match. Create one to continue.</p>}
              </div>
              {showNew && (
                <Modal title="New client" onClose={() => setShowNew(false)}>
                  <ClientForm onDone={(id) => { setShowNew(false); listClients("").then((cs) => { setClients(cs as Client[]); setBuyerId(id); setStep(2); }); }} />
                </Modal>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              {(docType === "AVOIR" || docType === "RECTIFICATIVE") && (
                <div className="card grid gap-3 p-4">
                  <div className="text-[13px]">Original invoice: <strong>{linked?.number ?? draft?.linkedInvoiceId ?? "—"}</strong></div>
                  <div>
                    <label className="label" htmlFor="motif">Reason (required) *</label>
                    <input id="motif" value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="e.g. Returned goods" className="input" />
                  </div>
                </div>
              )}
              <div className="card grid grid-cols-3 gap-3 p-4 max-md:grid-cols-2">
                <div><label className="label">Issue date *</label><input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input" /></div>
                <div><label className="label">Due date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" /><p className="hint">Empty = derived from terms</p></div>
                <div><label className="label">Currency</label><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input"><option>MAD</option><option>EUR</option><option>USD</option><option>GBP</option></select></div>
                <div><label className="label">Payment</label><select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="input"><option>VIREMENT</option><option>ESPECES</option><option>CHEQUE</option><option>EFFET</option></select></div>
                <div><label className="label">Terms</label><select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="input"><option value="ON_RECEIPT">Due on receipt</option><option value="D7">7 days</option><option value="D15">15 days</option><option value="D30">30 days</option><option value="D60">60 days</option><option value="CUSTOM">Custom</option></select></div>
                <div><label className="label">Purchase order</label><input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="BC-…" className="input" /></div>
                <div><label className="label">Invoice discount %</label><input type="number" min={0} max={100} value={invDiscPct} onChange={(e) => setInvDiscPct(Number(e.target.value))} className="input" /></div>
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Line items</span></div>
                {lines.map((l, i) => (
                  <div key={i} className={`border-b border-ink-100 dark:border-white/10 px-4 py-3 last:border-b-0 ${missingDesc(i) ? "bg-red-50/60 dark:bg-red-500/10" : ""}`}>
                    <input id={`line-desc-${i}`} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder={`Line ${i + 1} — description *`} aria-label={`Line ${i + 1} description`} aria-invalid={missingDesc(i)}
                      className={`mb-0.5 w-full rounded bg-transparent px-1 py-1 text-[13px] font-medium placeholder:font-normal focus:outline-none ${missingDesc(i) ? "placeholder:text-red-400 ring-1 ring-red-400" : "placeholder:text-ink-400 dark:placeholder:text-stone-500"}`} />
                    {missingDesc(i) && <p className="field-err mb-1 px-1">Description is required.</p>}
                    <div className="grid grid-cols-[70px_90px_1fr_70px_90px_34px] items-end gap-2 max-md:grid-cols-3">
                      <div><label className="label">Qty</label><input type="number" step="0.001" min={0} value={l.quantityMilli / 1000} onChange={(e) => setLine(i, { quantityMilli: Math.max(1, Math.round(Number(e.target.value) * 1000)) })} className="input num" /></div>
                      <div><label className="label">Unit</label><select value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} className="input">{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
                      <div><label className="label">Unit price HT</label><input type="number" min={0} value={l.unitPriceMinor / 100} onChange={(e) => setLine(i, { unitPriceMinor: Math.round(Number(e.target.value) * 100) })} className="input num" /></div>
                      <div><label className="label">Disc %</label><input type="number" min={0} max={100} value={l.discountBps / 100} onChange={(e) => setLine(i, { discountBps: Math.round(Number(e.target.value) * 100) })} className="input num" /></div>
                      <div><label className="label">TVA</label><select value={l.taxExempt ? -1 : l.taxRateBps} onChange={(e) => { const v = Number(e.target.value); setLine(i, v === -1 ? { taxExempt: true, taxRateBps: 0 } : { taxExempt: false, taxRateBps: v }); }} className="input">
                        {TVA_CHOICES.map((t) => <option key={t.label} value={t.v}>{t.label}</option>)}
                      </select></div>
                      <div className="flex gap-0.5 pb-0.5">
                        <button onClick={() => move(i, -1)} className="btn-ghost btn-sm px-1.5" aria-label="Move up"><GripVertical size={13} /></button>
                        <button onClick={() => setLines((ls) => [...ls.slice(0, i + 1), { ...ls[i] }, ...ls.slice(i + 1)])} className="btn-ghost btn-sm px-1.5" aria-label="Duplicate line"><Copy size={13} /></button>
                        <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="btn-ghost btn-sm px-1.5 hover:text-red-700" aria-label="Delete line"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setLines((ls) => [...ls, { description: "", quantityMilli: 1000, unit: "piece", unitPriceMinor: 0, discountBps: 0, taxRateBps: 2000, taxExempt: false }])} className="flex w-full items-center gap-1.5 px-4 py-2.5 text-[13px] text-ink-500 dark:text-stone-400 hover:bg-ink-50 dark:hover:bg-white/5 hover:text-ink-950 dark:hover:text-white">
                  <Plus size={14} /> Add line
                </button>
              </div>

              <div className="card p-4">
                <label className="label" htmlFor="notes">Notes</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" />
              </div>

              {err && <p className="field-err">{err}</p>}
              <div className="flex items-center gap-2">
                <button onClick={() => setStep(1)} className="btn-ghost"><ArrowLeft size={14} /> Back</button>
                <button onClick={save} disabled={saving} className="btn-primary ml-auto">
                  {saving ? "Saving…" : draft ? "Save changes" : "Save draft"} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sticky top-[68px] shrink-0 max-xl:static max-xl:w-full">
          <InvoicePreview doc={{
            docType, invoiceNumber: null, linkedNumber: linked?.number ?? null, correctionReason: correctionReason || null,
            issueDate, dueDate: dueDate || null, currency, locale: "fr",
            seller: sellerView, buyer: buyerView, lines,
            invDiscountBps: Math.round(invDiscPct * 100), invDiscountFixedMinor: 0,
            poNumber: poNumber || null, paymentMode, paymentTerms, notes: notes || null,
          }} />
          {!calc && <p className="field-err mt-2">Invalid lines — amounts must be ≥ 0.</p>}
        </div>
      </div>
    </div>
  );
}
