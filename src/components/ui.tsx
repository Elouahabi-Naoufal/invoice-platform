"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

/* ---------- Status badge (restrained) ---------- */
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  DRAFT: { background: "linear-gradient(to bottom,#ffffff,#dfe6ee)", color: "#33506b", border: "1px solid #8fa6bd" },
  ISSUED: { background: "linear-gradient(to bottom,#e8f0f9,#b9cfe6)", color: "#1f3a5f", border: "1px solid #7ba0c6" },
  SENT: { background: "linear-gradient(to bottom,#6db3e8,#2273b8)", color: "#fff", border: "1px solid #17578f" },
  VIEWED: { background: "linear-gradient(to bottom,#6db3e8,#2273b8)", color: "#fff", border: "1px solid #17578f" },
  PARTIALLY_PAID: { background: "linear-gradient(to bottom,#ffd97a,#f5a623)", color: "#5f3d00", border: "1px solid #b97a00" },
  PAID: { background: "linear-gradient(to bottom,#9ed69a,#4da64d)", color: "#fff", border: "1px solid #2f7a2f" },
  OVERDUE: { background: "linear-gradient(to bottom,#f08a80,#c12e2a)", color: "#fff", border: "1px solid #8f1f1c" },
  CANCELLED: { background: "linear-gradient(to bottom,#e2e2e2,#bdbdbd)", color: "#666", border: "1px solid #999", textDecoration: "line-through" },
};

export function StatusBadge({ value }: { value: string }) {
  const label = value.replace(/_/g, " ");
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase"
      style={{
        borderRadius: 999,
        letterSpacing: "0.04em",
        textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 2px rgba(20,40,70,0.35)",
        ...(STATUS_STYLE[value] ?? STATUS_STYLE.DRAFT),
      }}
    >
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
              {t.body && <div className="text-xs text-ink-500 dark:text-stone-400 mt-0.5">{t.body}</div>}
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
      <p className="text-[13px] text-ink-500 dark:text-stone-400 max-w-sm mb-5">{body}</p>
      {action}
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-100 dark:bg-white/10 ${className ?? "h-4 w-full"}`} />;
}

/* ---------- Submit button with loading guard ---------- */
export function SubmitButton({ children, className, pending }: { children: React.ReactNode; className?: string; pending?: boolean }) {
  return (
    <button type="submit" disabled={pending} className={className ?? "btn-primary"}>
      {pending ? "Saving…" : children}
    </button>
  );
}
