"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { setActiveCompany } from "@/server/auth";

type C = { id: string; legalName: string; city?: string | null; defaultCurrency: string; logoPath?: string | null };

function Avatar({ c, size }: { c: C; size: string }) {
  if (c.logoPath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.logoPath} alt="" className={`${size} shrink-0 rounded-md border border-ink-200 dark:border-white/10 object-contain`} />;
  }
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-md bg-ink-950 text-xs font-semibold text-white`}>
      {c.legalName.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function CompanySwitcher({ companies, activeId }: { companies: C[]; activeId: string | null }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = companies.find((c) => c.id === activeId) ?? companies[0] ?? null;

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function pick(id: string) {
    await setActiveCompany(id);
    setOpen(false);
    r.refresh();
  }

  if (!active) return <a href="/companies?new=1" className="btn-outline btn-sm">Add company</a>;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-lg border border-ink-200 dark:border-white/10 bg-white dark:bg-[#1C1917] px-3 py-1.5 hover:border-ink-400 dark:hover:border-white/30 transition-colors" aria-haspopup="listbox" aria-expanded={open}>
        <Avatar c={active} size="h-7 w-7" />
        <span className="text-left">
          <span className="block text-[13px] font-medium leading-tight">{active.legalName}</span>
          <span className="meta block leading-tight">Current company</span>
        </span>
        <ChevronDown size={15} className="text-ink-400 dark:text-stone-500" />
      </button>
      {open && (
        <div className="card absolute right-0 top-full z-40 mt-1.5 w-64 p-1.5 shadow-pop" role="listbox">
          {companies.map((c) => (
            <button key={c.id} onClick={() => pick(c.id)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-ink-50 dark:hover:bg-white/5" role="option" aria-selected={c.id === active.id}>
              <Avatar c={c} size="h-7 w-7" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{c.legalName}</span>
                <span className="meta block">{c.city ?? ""} · {c.defaultCurrency}</span>
              </span>
              {c.id === active.id && <Check size={15} className="text-brand-600" />}
            </button>
          ))}
          <a href="/companies?new=1" className="mt-1 flex items-center gap-2 rounded-md border-t border-ink-100 dark:border-white/10 px-2.5 py-2 text-[13px] text-ink-500 dark:text-stone-400 hover:bg-ink-50 dark:hover:bg-white/5">
            <Plus size={15} /> Add company
          </a>
        </div>
      )}
    </div>
  );
}
