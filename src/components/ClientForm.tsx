"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient } from "@/server/companies-clients";

const inp = { padding: 8, border: "1px solid #ccc", borderRadius: 6, width: "100%" } as const;

export default function ClientForm({ initial, onDone }: { initial?: Record<string, unknown>; onDone?: (id: string) => void }) {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [type, setType] = useState<string>((initial?.type as string) ?? "COMPANY");
  async function submit(f: FormData) {
    setErr("");
    const obj: Record<string, string> = {};
    f.forEach((v, k) => { obj[k] = String(v); });
    const data = { ...obj, type, isAssujetti: obj.isAssujetti === "on" };
    try {
      let id = initial?.id as string | undefined;
      if (id) await updateClient(id, data);
      else { const c = await createClient(data); id = c.id; }
      if (onDone && id) onDone(id);
      else { r.push("/clients"); r.refresh(); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    }
  }
  const v = (k: string) => (initial?.[k] as string) ?? "";
  return (
    <form action={submit} style={{ display: "grid", gap: 10, background: "#fff", padding: 20, borderRadius: 8 }}>
      <label>Type :
        <select value={type} onChange={(e) => setType(e.target.value)} style={inp}>
          <option value="COMPANY">Société (B2B — ICE requis)</option>
          <option value="PERSON">Particulier (B2C — ICE non requis)</option>
        </select>
      </label>
      {type === "COMPANY" ? (
        <>
          <input name="companyName" placeholder="Raison sociale *" required defaultValue={v("companyName")} style={inp} />
          <input name="name" placeholder="Contact" defaultValue={v("name") || "Contact"} style={inp} />
          <input name="ice" placeholder="ICE client — 15 chiffres (B2B assujetti)" pattern="\d{15}" defaultValue={v("ice")} style={inp} />
          <input name="clientIF" placeholder="IF client" defaultValue={v("clientIF")} style={inp} />
          <input name="clientRC" placeholder="RC client" defaultValue={v("clientRC")} style={inp} />
          <label style={{ fontSize: 13 }}><input type="checkbox" name="isAssujetti" defaultChecked={initial?.isAssujetti !== false} /> Assujetti TVA</label>
        </>
      ) : (
        <input name="name" placeholder="Nom complet *" required defaultValue={v("name")} style={inp} />
      )}
      <input name="email" placeholder="Email" defaultValue={v("email")} style={inp} />
      <input name="phone" placeholder="Téléphone" defaultValue={v("phone")} style={inp} />
      <input name="address" placeholder="Adresse" defaultValue={v("address")} style={inp} />
      <input name="city" placeholder="Ville" defaultValue={v("city")} style={inp} />
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <button type="submit">Enregistrer</button>
    </form>
  );
}
