export default function Loading() {
  return (
    <div className="grid gap-4 py-10" aria-busy="true" aria-live="polite">
      <div className="h-7 w-56 animate-pulse rounded bg-ink-100 dark:bg-white/10" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-ink-100 dark:bg-white/10" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-ink-100 dark:bg-white/10" />
    </div>
  );
}
