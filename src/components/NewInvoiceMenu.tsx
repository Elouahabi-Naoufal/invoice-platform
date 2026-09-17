"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Repeat } from "lucide-react";
import { listRecurringTemplates } from "@/server/recurring";
import { cn } from "@/components/ui";

interface T { id: string; name: string; docType: string }

export default function NewInvoiceMenu({ up, className }: { up?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<T[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && templates === null) {
      try {
        setTemplates((await listRecurringTemplates()) as unknown as T[]);
      } catch {
        setTemplates([]);
      }
    }
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button onClick={toggle} className="btn-accent w-full justify-between" aria-haspopup="menu" aria-expanded={open}>
        <span className="flex items-center gap-2"><Plus size={16} /> New invoice</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className={cn("card absolute z-40 w-full min-w-[250px] p-1.5 shadow-pop", up ? "bottom-full mb-1.5" : "top-full mt-1.5")} role="menu">
          <Link href="/invoices/new" className="flex items-center gap-2 rounded px-2.5 py-2 text-[13px] hover:bg-ink-50 dark:hover:bg-white/5" role="menuitem">
            <Plus size={15} /> Blank invoice
          </Link>
          <div className="my-1 border-t border-ink-100 dark:border-white/10" />
          <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">From a template</p>
          {templates === null && <p className="px-2.5 py-1.5 text-[12px] text-ink-400">Loading…</p>}
          {templates?.length === 0 && <p className="px-2.5 py-1.5 text-[12px] text-ink-400">No templates yet.</p>}
          {templates?.map((t) => (
            <Link key={t.id} href={`/invoices/new?template=${t.id}`} className="flex items-center gap-2 rounded px-2.5 py-2 text-[13px] hover:bg-ink-50 dark:hover:bg-white/5" role="menuitem">
              <Repeat size={15} /> {t.name}
              <span className="meta ml-auto">{t.docType}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
