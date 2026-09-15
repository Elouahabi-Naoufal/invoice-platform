"use client";
import { useRouter } from "next/navigation";
import { togglePortalShare } from "@/server/portal";
import { useToast } from "@/components/ui";

export function PortalToggle({ id, shared }: { id: string; shared: boolean }) {
  const r = useRouter(); const toast = useToast();
  return (
    <button
      onClick={async () => { await togglePortalShare(id, !shared); toast({ kind: "ok", title: shared ? "Removed from portal" : "Shared on portal" }); r.refresh(); }}
      className={shared ? "btn-ghost btn-sm hover:text-red-700" : "btn-primary btn-sm"}
    >
      {shared ? "Unshare" : "Share on portal"}
    </button>
  );
}
