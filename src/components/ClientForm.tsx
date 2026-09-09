"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient } from "@/server/companies-clients";
import { useToast } from "@/components/ui";

export default function ClientForm({ initial, onDone }: { initial?: Record<string, unknown>; onDone?: (id: string) => void }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<string>((initial?.type as string) ?? "COMPANY");
  const v = (k: string) => (initial?.[k] as string) ?? "";

  async function submit(f: FormData) {
    setErr(""); setSaving(true);
    const obj: Record<string, string> = {};
    f.forEach((val, k) => { obj[k] = String(val); });
    try {
      let id = initial?.id as string | undefined;
      const data = { ...obj, type, isAssujetti: obj.isAssujetti === "on" };
      if (id) { await updateClient(id, data); toast({ kind: "ok", title: "Client updated" }); }
      else { const c = await createClient(data); id = c.id; toast({ kind: "ok", title: "Client created" }); }
      if (onDone && id) onDone(id);
      else { r.push("/clients"); r.refresh(); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setErr(msg);
      toast({ kind: "err", title: "Unable to save client", body: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={submit} className="grid gap-3">
      <div>
        <label className="label">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input">
          <option value="COMPANY">Company — B2B, ICE required at invoice time</option>
          <option value="PERSON">Individual — B2C, no ICE needed</option>
        </select>
      </div>
      {type === "COMPANY" ? (
        <>
          <div><label className="label">Company name *</label><input name="companyName" required defaultValue={v("companyName")} className="input" /></div>
          <div><label className="label">Contact person</label><input name="name" defaultValue={v("name") || "Contact"} className="input" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">ICE (15 digits)</label><input name="ice" pattern="\d{15}" defaultValue={v("ice")} className="input tabular-nums" /></div>
            <div><label className="label">IF</label><input name="clientIF" defaultValue={v("clientIF")} className="input" /></div>
            <div><label className="label">RC</label><input name="clientRC" defaultValue={v("clientRC")} className="input" /></div>
          </div>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="isAssujetti" defaultChecked={initial?.isAssujetti !== false} className="accent-brand-600" /> Subject to TVA</label>
        </>
      ) : (
        <div><label className="label">Full name *</label><input name="name" required minLength={2} defaultValue={v("name")} className="input" /></div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Email</label><input name="email" type="email" defaultValue={v("email")} className="input" /></div>
        <div><label className="label">Phone</label><input name="phone" defaultValue={v("phone")} className="input" /></div>
        <div><label className="label">Address</label><input name="address" defaultValue={v("address")} className="input" /></div>
        <div><label className="label">City</label><input name="city" defaultValue={v("city")} className="input" /></div>
      </div>
      {err && <p className="field-err">{err}</p>}
      <div className="flex justify-end"><button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save client"}</button></div>
    </form>
  );
}
