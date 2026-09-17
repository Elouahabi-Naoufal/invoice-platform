import { requireUser } from "@/server/auth";
import SupportKeyDisplay from "@/components/SupportKeyDisplay";

export default function SupportPage() {
  const key = process.env.SUPPORT_KEY || "";

  return (
    <div>
      <h1 className="page-title mb-1">Support</h1>
      <p className="meta mb-6">If you need help, share your support key with the Invora team.</p>
      <div className="card p-5 max-w-lg">
        <h2 className="section-title mb-2">Your support key</h2>
        {key ? (
          <SupportKeyDisplay supportKey={key} />
        ) : (
          <p className="meta">No support key configured for this deployment.</p>
        )}
        <div className="mt-4 border-t border-ink-100 pt-4 dark:border-white/10">
          <p className="text-[13px] text-ink-500">
            Contact the admin at <strong>support@invora.app</strong> with your support key to request assistance.
          </p>
        </div>
      </div>
    </div>
  );
}