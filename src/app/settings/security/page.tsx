import PasswordForm from "@/components/PasswordForm";

export default function SecuritySettingsPage() {
  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <h2 className="section-title mb-1">Password</h2>
        <p className="mb-3 text-[13px] text-ink-500 dark:text-stone-400">
          Change the password for your account. Minimum 8 characters. Repeated failed logins are rate-limited.
        </p>
        <PasswordForm />
      </div>
    </div>
  );
}
