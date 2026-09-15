"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, archiveProduct } from "@/server/products";
import { useToast } from "@/components/ui";

export default function ProductForm({ initial, onDone }: { initial?: Record<string, unknown> | null; onDone?: () => void }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  const v = (k: string) => (initial?.[k] as string) ?? "";
  const n = (k: string) => (initial?.[k] as number | undefined);
  async function submit(fd: FormData) {
    setErr("");
    const obj: Record<string, string> = {};
    fd.forEach((val, k) => { obj[k] = String(val); });
    const data = {
      name: obj.name?.trim(),
      description: obj.description?.trim() || undefined,
      unit: obj.unit || "piece",
      unitPriceMinor: Math.round(Number(obj.unitPrice) * 100),
      taxRateBps: obj.tax === "exempt" ? 0 : Number(obj.tax),
      taxExempt: obj.tax === "exempt",
    };
    if (!data.name || data.name.length < 2) { setErr("Name required (≥2 chars)"); return; }
    if (!Number.isFinite(data.unitPriceMinor) || data.unitPriceMinor < 0) { setErr("Price must be ≥ 0"); return; }
    try {
      if (initial?.id) await updateProduct(String(initial.id), data as never);
      else await createProduct(data as never);
      toast({ kind: "ok", title: initial?.id ? "Product updated" : "Product created" });
      if (onDone) onDone();
      r.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setErr(msg); toast({ kind: "err", title: "Unable to save", body: msg.slice(0, 200) });
    }
  }
  return (
    <form action={submit as never} noValidate className="grid gap-3">
      <div><label className="label">Name *</label><input name="name" required minLength={2} defaultValue={v("name")} className="input" placeholder="e.g. Consulting — daily rate" /></div>
      <div><label className="label">Description</label><input name="description" defaultValue={v("description")} className="input" placeholder="Optional details shown on invoice line" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Unit</label>
          <select name="unit" defaultValue={v("unit") || "piece"} className="input">
            <option value="piece">pièce</option><option value="heure">heure</option><option value="jour">jour</option><option value="kg">kg</option><option value="service">service</option><option value="forfait">forfait</option>
          </select>
        </div>
        <div><label className="label">Unit price HT *</label><input name="unitPrice" type="number" min={0} step="0.01" required defaultValue={n("unitPriceMinor") != null ? (n("unitPriceMinor")! / 100).toString() : ""} className="input" placeholder="0.00" /></div>
        <div><label className="label">TVA</label>
          <select name="tax" defaultValue={initial?.taxExempt ? "exempt" : String(initial?.taxRateBps ?? 2000)} className="input">
            <option value="2000">20%</option><option value="1400">14%</option><option value="1000">10%</option><option value="700">7%</option><option value="0">0%</option><option value="exempt">Exonéré</option>
          </select>
        </div>
      </div>
      {err && <p className="field-err">{err}</p>}
      <div className="flex justify-end gap-2">
        {initial?.id ? (
          <button type="button" onClick={async () => { await archiveProduct(String(initial.id)); toast({ kind: "ok", title: "Archived" }); if (onDone) onDone(); r.refresh(); }} className="btn-ghost btn-sm hover:text-red-700">Archive</button>
        ) : null}
        <button type="submit" className="btn-primary">{initial?.id ? "Update" : "Create"}</button>
      </div>
    </form>
  );
}
