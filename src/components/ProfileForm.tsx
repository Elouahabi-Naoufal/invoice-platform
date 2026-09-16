"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/server/auth";
import { useToast } from "@/components/ui";

export default function ProfileForm({ initialName }: { initialName: string }) {
  const r = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(fd: FormData) {
    setErr("");
    setBusy(true);
    try {
      await updateProfile(String(fd.get("displayName") ?? ""));
      toast({ kind: "ok", title: "Profile updated" });
      r.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Failed";
      setErr(m);
      toast({ kind: "err", title: m });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[240px] flex-1">
        <label className="label">Display name</label>
        <input name="displayName" defaultValue={initialName} minLength={2} required className="input" />
      </div>
      <button disabled={busy} className="btn-primary btn-sm">{busy ? "Saving…" : "Save"}</button>
      {err && <p className="field-err w-full">{err}</p>}
    </form>
  );
}
