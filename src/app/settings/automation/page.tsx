import RunAutomationButton from "@/components/RunAutomationButton";

export default function AutomationSettingsPage() {
  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <h2 className="section-title mb-1">Background automation</h2>
        <p className="text-[13px] text-ink-500 dark:text-stone-400">
          Recurring invoices are generated on schedule and due reminders are sent automatically by a
          background worker inside the app. It runs every few minutes while the server is up.
        </p>
        <div className="mt-4">
          <RunAutomationButton />
        </div>
      </div>
      <div className="card p-5">
        <h2 className="section-title mb-1">Configuration</h2>
        <p className="text-[13px] text-ink-500 dark:text-stone-400">
          The worker is enabled when <code className="rounded-sm bg-ink-100 px-1 text-[12px] dark:bg-white/10">CRON_SECRET</code> is set in
          the environment. Set <code className="rounded-sm bg-ink-100 px-1 text-[12px] dark:bg-white/10">SCHEDULER_ENABLED=false</code> to disable it,
          or <code className="rounded-sm bg-ink-100 px-1 text-[12px] dark:bg-white/10">SCHEDULER_INTERVAL_MS</code> to change the frequency.
        </p>
      </div>
    </div>
  );
}
