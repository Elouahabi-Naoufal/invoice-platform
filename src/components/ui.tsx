"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

/* ---------- Status badge (restrained) ---------- */
const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-700",
  ISSUED: "bg-ink-100 text-ink-950",
  SENT: "bg-brand-50 text-brand-700",
  VIEWED: "bg-brand-50 text-brand-700",
  PARTIALLY_PAID: "bg-amber-50 text-amber-800",
  PAID: "bg-emerald-50 text-emerald-800",
  OVERDUE: "bg-red-50 text-red-800",
  CANCELLED: "bg-ink-100 text-ink-400 line-through",
};

export function StatusBadge({ value }: { value: string }) {
  const label = value.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide ${STATUS_STYLE[value] ?? "bg-ink-100 text-ink-700"}`}>
      {label}
    </span>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`w-full ${wide ? "max-w-lg" : "max-w-md"} card p-6 shadow-pop`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
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
          <div key={t.id} className="card flex items-start gap-2.5 px-4 py-3 shadow-pop max-w-sm">
            {t.kind === "ok"
              ? <CheckCircle2 size={16} className="text-emerald-700 mt-0.5 shrink-0" />
              : <AlertCircle size={16} className="text-red-700 mt-0.5 shrink-0" />}
            <div>
              <div className="text-[13px] font-medium">{t.title}</div>
              {t.body && <div className="text-xs text-ink-500 mt-0.5">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="page-title mb-1">{title}</div>
      <p className="text-[13px] text-ink-500 max-w-sm mb-5">{body}</p>
      {action}
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-100 ${className ?? "h-4 w-full"}`} />;
}

/* ---------- Submit button with loading guard ---------- */
export function SubmitButton({ children, className, pending }: { children: React.ReactNode; className?: string; pending?: boolean }) {
  return (
    <button type="submit" disabled={pending} className={className ?? "btn-primary"}>
      {pending ? "Saving…" : children}
    </button>
  );
}
