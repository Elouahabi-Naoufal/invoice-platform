"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { provisionTenant, retryTenantProvisioning, suspendTenant, resumeTenant, deleteTenant } from "@/server/admin-ops";

export default function TenantProvisionActions({ id, status }: { id: string; status: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg("");
    try { await fn(); setMsg(ok); r.refresh(); }
    catch (e) { setMsg(`Error: ${e instanceof Error ? e.message : "failed"}`); }
    finally { setBusy(false); setConfirmDelete(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(status === "APPROVED" || status === "FAILED") && (
        <button disabled={busy} onClick={() => run(() => provisionTenant(id), "Provisioning started")} className="btn-primary btn-sm">
          {status === "FAILED" ? "Retry provisioning" : "Provision"}
        </button>
      )}
      {status === "FAILED" && (
        <button disabled={busy} onClick={() => run(() => retryTenantProvisioning(id), "Retry started")} className="btn-outline btn-sm">Reset & retry</button>
      )}
      {status === "ACTIVE" && (
        <button disabled={busy} onClick={() => run(() => suspendTenant(id), "Suspended")} className="btn-ghost btn-sm hover:text-red-700">Suspend</button>
      )}
      {status === "SUSPENDED" && (
        <button disabled={busy} onClick={() => run(() => resumeTenant(id), "Resumed")} className="btn-outline btn-sm">Resume</button>
      )}
      {!confirmDelete ? (
        <button disabled={busy} onClick={() => setConfirmDelete(true)} className="btn-ghost btn-sm hover:text-red-700">Delete tenant</button>
      ) : (
        <>
          <button disabled={busy} onClick={() => run(() => deleteTenant(id), "Tenant deleted")} className="btn-danger btn-sm">
            {busy ? "Deleting…" : "Confirm delete"}
          </button>
          <button disabled={busy} onClick={() => setConfirmDelete(false)} className="btn-ghost btn-sm">Cancel</button>
        </>
      )}
      {msg && <span className="text-[12px] text-ink-500">{msg}</span>}
    </div>
  );
}