"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteMember, revokeMember } from "@/server/members";
import { useToast } from "@/components/ui";

export function MemberForm({ onDone }: { onDone: () => void }) {
  const r = useRouter(); const toast = useToast(); const [err, setErr] = useState("");
  async function submit(fd: FormData) {
    const obj: Record<string, string> = {}; fd.forEach((v, k) => { obj[k] = String(v); });
    try {
      await inviteMember("", { email: obj.email.trim(), role: obj.role } as never);
      toast({ kind: "ok", title: "Member invited" }); onDone(); r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }
  return (
    <form action={submit as never} className="flex flex-wrap gap-2 items-end">
      <div><label className="label">Email *</label><input name="email" type="email" required placeholder="colleague@company.ma" className="input min-w-[240px]" /></div>
      <div><label className="label">Role *</label><select name="role" className="input" defaultValue="VIEWER"><option value="VIEWER">Viewer — read only</option><option value="ADMIN">Admin — manage invoices</option></select></div>
      <button type="submit" className="btn-primary btn-sm">Invite</button>
      {err && <p className="field-err w-full">{err}</p>}
    </form>
  );
}

export function MemberRowActions({ id }: { id: string }) {
  const r = useRouter(); const toast = useToast();
  return <button onClick={async () => { await revokeMember(id); toast({ kind: "ok", title: "Revoked" }); r.refresh(); }} className="text-xs text-red-600 hover:underline">Revoke</button>;
}
