"use client";
import React from "react";
import Link from "next/link";
import { cn } from "@/components/ui";
import { Inbox } from "lucide-react";

export type AdmTone = "brand" | "success" | "warning" | "error" | "info" | "neutral";

export const TILE_TONE: Record<AdmTone, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500",
  error: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
  info: "bg-info-50 text-info-600 dark:bg-info-500/15 dark:text-info-500",
  neutral: "bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-gray-300",
};

const BADGE_TONE: Record<AdmTone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-400/20",
  success: "bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/15 dark:text-success-500 dark:ring-success-400/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-600/20 dark:bg-warning-500/15 dark:text-warning-500 dark:ring-warning-400/20",
  error: "bg-error-50 text-error-700 ring-error-600/20 dark:bg-error-500/15 dark:text-error-500 dark:ring-error-400/20",
  info: "bg-info-50 text-info-700 ring-info-600/20 dark:bg-info-500/15 dark:text-info-500 dark:ring-info-400/20",
  neutral: "bg-ink-100 text-ink-700 ring-ink-500/20 dark:bg-white/10 dark:text-gray-300 dark:ring-white/15",
};

const DOT_TONE: Record<AdmTone, string> = {
  brand: "bg-brand-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  error: "bg-error-500",
  info: "bg-info-500",
  neutral: "bg-ink-400",
};

export function AdminBadge({ tone = "neutral", dot = false, children }: { tone?: AdmTone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", BADGE_TONE[tone])}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_TONE[tone])} />}
      {children}
    </span>
  );
}

export function AdminTile({ tone = "neutral", size = "md", children }: { tone?: AdmTone; size?: "sm" | "md" | "lg"; children: React.ReactNode }) {
  const s = size === "sm" ? "h-7 w-7 rounded" : size === "lg" ? "h-12 w-12 rounded-lg" : "h-9 w-9 rounded-md";
  return <span className={cn("grid shrink-0 place-items-center", s, TILE_TONE[tone])}>{children}</span>;
}

export function AdminPageHeader({
  eyebrow, title, description, actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink-200/80 pb-5 dark:border-white/10">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">{eyebrow}</div>
        )}
        <h1 className="text-[24px] font-semibold tracking-tight text-ink-950 dark:text-white">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-500 dark:text-gray-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminStatCard({
  label, value, sub, icon, tone = "neutral", href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: AdmTone;
  href?: string;
}) {
  const inner = (
    <div className="group flex h-full flex-col rounded-lg border border-ink-200/80 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-pop dark:border-white/10 dark:bg-[#1D2939] dark:hover:border-white/20">
      <div className={cn("grid h-11 w-11 place-items-center rounded-lg", TILE_TONE[tone])}>{icon}</div>
      <div className="mt-4">
        <div className="text-[30px] font-semibold leading-none tracking-tight text-ink-950 tabular-nums dark:text-white">{value}</div>
        <div className="mt-2 text-[12px] font-medium text-ink-500 dark:text-gray-400">{label}</div>
        {sub && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-500 dark:bg-white/5 dark:text-gray-400">
            <span className={cn("h-1 w-1 rounded-full", DOT_TONE[tone])} />
            {sub}
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

export function AdminPanel({
  title, subtitle, icon, action, children, padded = true, tone = "brand", className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  tone?: AdmTone;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-ink-200/80 bg-white shadow-card dark:border-white/10 dark:bg-[#1D2939]", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-ink-200/70 px-5 py-3.5 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <AdminTile size="sm" tone={tone}>{icon}</AdminTile>}
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold tracking-tight text-ink-950 dark:text-white">{title}</h2>
            {subtitle && <p className="truncate text-[12px] text-ink-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className={cn("overflow-x-auto scroll-thin", padded ? "p-5" : "")}>{children}</div>
    </section>
  );
}

export function AdminEmpty({ title, body, action, icon }: { title: string; body: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400 dark:bg-white/5 dark:text-gray-400">
        {icon ?? <Inbox size={22} />}
      </span>
      <h3 className="text-[15px] font-semibold text-ink-950 dark:text-white">{title}</h3>
      <p className="mt-1 mb-5 max-w-sm text-[13px] text-ink-500 dark:text-gray-400">{body}</p>
      {action}
    </div>
  );
}

export function CompanyMark({ name, size = "h-9 w-9" }: { name: string; size?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-md bg-brand-50 text-[12px] font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400", size)}>
      {initials}
    </span>
  );
}