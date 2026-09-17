"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, ChevronDown } from "lucide-react";
import { logout } from "@/server/auth";
import { Avatar } from "@/components/ui";

export default function UserMenu({ name, email }: { name: string; email: string }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function signOut() {
    await logout();
    r.push("/login");
    r.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border border-transparent px-1.5 py-1 hover:border-ink-200 hover:bg-ink-50 dark:hover:border-white/10 dark:hover:bg-white/5"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name} size="h-8 w-8" />
        <ChevronDown size={14} className="text-ink-400" />
      </button>
      {open && (
        <div className="card absolute right-0 top-full z-40 mt-1.5 w-60 p-1.5 shadow-pop" role="menu">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <Avatar name={name} size="h-9 w-9" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{name}</span>
              <span className="meta block truncate">{email}</span>
            </span>
          </div>
          <div className="my-1 border-t border-ink-100 dark:border-white/10" />
          <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] hover:bg-ink-50 dark:hover:bg-white/5" role="menuitem">
            <Settings size={15} /> Settings
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[13px] text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10" role="menuitem">
            <LogOut size={15} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
