"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ensureClientPortalToken, revokeClientPortalToken } from "@/server/client-portal";
import { useToast } from "@/components/ui";

export function ClientPortalActions({ clientId, token, appUrl }: { clientId: string; token: string | null; appUrl: string }) {
  const r = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const { token: t } = await ensureClientPortalToken(clientId);
      await navigator.clipboard.writeText(`${appUrl}/portal/client/${t}`).catch(() => undefined);
      toast({ kind: "ok", title: "Portal link ready", body: "Copied to clipboard" });
      r.refresh();
    } catch (e) {
      toast({ kind: "err", title: "Failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      await revokeClientPortalToken(clientId);
      toast({ kind: "ok", title: "Portal access revoked" });
      r.refresh();
    } catch (e) {
      toast({ kind: "err", title: "Failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center justify-end gap-1">
      {token ? (
        <>
          <code className="rounded bg-ink-100 px-1 text-[11px] dark:bg-white/10">{`${appUrl}/portal/client/${token.slice(0, 10)}…`}</code>
          <button disabled={busy} onClick={generate} className="btn-ghost btn-sm">Copy</button>
          <button disabled={busy} onClick={revoke} className="btn-ghost btn-sm hover:text-red-700">Revoke</button>
        </>
      ) : (
        <button disabled={busy} onClick={generate} className="btn-outline btn-sm">Generate link</button>
      )}
    </span>
  );
}
