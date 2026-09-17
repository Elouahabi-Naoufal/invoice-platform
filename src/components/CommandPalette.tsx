"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Plus, UserPlus, Building2, Package } from "lucide-react";
import { NAV_FLAT } from "@/components/nav";
import { Kbd } from "@/components/ui";

interface Cmd {
  label: string;
  group: string;
  href: string;
  icon: typeof Search;
}

const ACTIONS: Cmd[] = [
  { label: "New invoice", group: "Actions", href: "/invoices/new", icon: Plus },
  { label: "New client", group: "Actions", href: "/clients?new=1", icon: UserPlus },
  { label: "New company", group: "Actions", href: "/companies?new=1", icon: Building2 },
  { label: "New product", group: "Actions", href: "/products?new=1", icon: Package },
];

const ALL: Cmd[] = [
  ...ACTIONS,
  ...NAV_FLAT.map((n) => ({ label: n.label, group: n.group, href: n.href, icon: n.icon as unknown as typeof Search })),
];

export function CommandTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("invora:cmdk"))}
      className="flex items-center gap-2 rounded border border-ink-200 bg-ink-50/60 px-3 py-2 text-[13px] text-ink-400 hover:border-ink-400 dark:border-white/10 dark:bg-white/5"
    >
      <Search size={15} />
      <span className="hidden sm:inline">Search or jump to…</span>
      <span className="ml-auto hidden items-center gap-0.5 sm:flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
    </button>
  );
}

export default function CommandPalette() {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const toggle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    const openEvt = () => setOpen(true);
    const closeEvt = () => setOpen(false);
    document.addEventListener("keydown", toggle);
    window.addEventListener("invora:cmdk", openEvt);
    window.addEventListener("invora:cmdk-close", closeEvt);
    return () => {
      document.removeEventListener("keydown", toggle);
      window.removeEventListener("invora:cmdk", openEvt);
      window.removeEventListener("invora:cmdk-close", closeEvt);
    };
  }, []);

  useEffect(() => {
    if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 20); }
  }, [open]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query ? ALL.filter((c) => c.label.toLowerCase().includes(query) || c.group.toLowerCase().includes(query)) : ALL;
    return list.slice(0, 12);
  }, [q]);

  useEffect(() => { setIdx(0); }, [q]);

  if (!open) return null;

  function go(cmd: Cmd) {
    setOpen(false);
    r.push(cmd.href);
    r.refresh();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ink-950/50 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded border border-ink-200 bg-white shadow-pop dark:border-white/10 dark:bg-[#1D2939]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-ink-200 px-3.5 dark:border-white/10">
          <Search size={16} className="text-ink-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter" && results[idx]) { go(results[idx]); }
              else if (e.key === "Escape") { setOpen(false); }
            }}
            placeholder="Type a page or action…"
            className="w-full bg-transparent py-3 text-[14px] outline-none placeholder:text-ink-400"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-[340px] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-400">No results</p>
          ) : (
            results.map((c, i) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.href + c.label}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => go(c)}
                  className={`flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[13px] ${i === idx ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "hover:bg-ink-50 dark:hover:bg-white/5"}`}
                >
                  <Icon size={15} className="text-ink-400" />
                  <span className="flex-1">{c.label}</span>
                  <span className="text-[11px] text-ink-400">{c.group}</span>
                  {i === idx && <CornerDownLeft size={13} className="text-ink-400" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
