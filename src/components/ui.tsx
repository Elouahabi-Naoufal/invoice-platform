"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, X, ChevronRight, Inbox } from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Status badge ---------- */
const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-700 dark:bg-white/5 dark:text-white/80",
  ISSUED: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  SENT: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  PARTIALLY_PAID: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
  PAID: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  OVERDUE: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
  CANCELLED: "bg-ink-100 text-ink-400 line-through dark:bg-white/5 dark:text-white/40",
};

export function StatusBadge({ value }: { value: string }) {
  const label = value.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center justify-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[value] ?? STATUS_STYLE.DRAFT)}>
      {label}
    </span>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, size = "h-9 w-9", className }: { name: string; size?: string; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400", size, className)}>
      {initials}
    </span>
  );
}

/* ---------- Keyboard hint ---------- */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-sm border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
      {children}
    </kbd>
  );
}

/* ---------- Breadcrumbs ---------- */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[12px] text-ink-400">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={13} />}
          {it.href ? (
            <Link href={it.href} className="hover:text-ink-700 dark:hover:text-gray-200">{it.label}</Link>
          ) : (
            <span className="text-ink-500 dark:text-gray-400">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({
  title, description, actions, breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="page-title truncate">{title}</h1>
        {description && <p className="meta mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Stat card ---------- */
const STAT_TONES: Record<string, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500",
  error: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
  neutral: "bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-gray-300",
};

export function StatCard({
  label, value, sub, icon, tone = "neutral", href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: keyof typeof STAT_TONES;
  href?: string;
}) {
  const inner = (
    <div className="card flex items-center gap-4 p-4 transition-colors hover:border-ink-400 dark:hover:border-white/20">
      {icon && <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded", STAT_TONES[tone])}>{icon}</span>}
      <span className="min-w-0">
        <span className="meta block">{label}</span>
        <span className="block truncate text-[22px] font-semibold leading-tight text-ink-950 tabular-nums dark:text-white">{value}</span>
        {sub && <span className="meta block truncate">{sub}</span>}
      </span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ---------- Card section with header ---------- */
export function SectionCard({
  title, action, children, padded,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3 dark:border-white/10">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      <div className={padded ? "p-4" : undefined}>{children}</div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ title, body, action, icon, bare }: { title: string; body: string; action?: React.ReactNode; icon?: React.ReactNode; bare?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", !bare && "card")}>
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400 dark:bg-white/5 dark:text-gray-400">
        {icon ?? <Inbox size={22} />}
      </span>
      <h3 className="text-[15px] font-semibold text-ink-950 dark:text-white">{title}</h3>
      <p className="mt-1 mb-5 max-w-sm text-[13px] text-ink-500 dark:text-stone-400">{body}</p>
      {action}
    </div>
  );
}

/* ---------- Skeletons ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-ink-100 dark:bg-white/10", className ?? "h-4 w-full")} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-200 px-4 py-3 dark:border-white/10"><Skeleton className="h-4 w-40" /></div>
      <div className="divide-y divide-ink-100 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-32" : c === cols - 1 ? "ml-auto w-16" : "w-20")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4 p-4">
          <Skeleton className="h-11 w-11 rounded" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-32" /></div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  title, children, onClose, size = "md",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const width = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-md";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn("w-full card p-5 shadow-pop outline-none", width)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="btn-ghost btn-sm -mr-2 -mt-1"><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */
type Toast = { id: number; kind: "ok" | "err"; title: string; body?: string };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { ...t, id }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="card flex max-w-sm items-start gap-2.5 px-4 py-3 shadow-pop">
            {t.kind === "ok"
              ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
              : <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-700" />}
            <div>
              <div className="text-[13px] font-medium">{t.title}</div>
              {t.body && <div className="mt-0.5 text-xs text-ink-500 dark:text-stone-400">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Toasts ---------- */
