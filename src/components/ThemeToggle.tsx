"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/** TailAdmin-style theme toggle (toggles .dark on <html>, persisted). */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("ip-theme", next ? "dark" : "light"); } catch { /* ignore */ }
  }
  // Restore on mount (before paint would need inline script; acceptable flash-free enough)
  useEffect(() => {
    try {
      if (localStorage.getItem("ip-theme") === "dark") {
        setDark(true);
        document.documentElement.classList.add("dark");
      }
    } catch { /* ignore */ }
  }, []);
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white text-ink-500 hover:bg-ink-50 hover:text-ink-950 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
