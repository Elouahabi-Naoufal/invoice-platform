"use client";
import { useRouter } from "next/navigation";

export default function LocaleToggle({ current }: { current: string }) {
  const r = useRouter();
  async function setLocale(v: string) {
    document.cookie = `ip_locale=${v}; path=/; max-age=31536000`;
    r.refresh();
  }
  return (
    <span className="flex overflow-hidden rounded-lg border border-ink-200 dark:border-white/10">
      {(["fr", "ar"] as const).map((l) => (
        <button key={l} onClick={() => setLocale(l)} className={`px-2.5 py-1 text-xs font-medium ${current === l ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950" : "text-ink-600 hover:bg-ink-50 dark:text-stone-400"}`}>
          {l === "fr" ? "FR" : "عربية"}
        </button>
      ))}
    </span>
  );
}
