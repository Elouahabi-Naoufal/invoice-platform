import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-ink-400">
      <Link href="/home" className="hover:text-ink-700 dark:hover:text-gray-200">Home</Link>
      <Link href="/privacy" className="hover:text-ink-700 dark:hover:text-gray-200">Privacy policy</Link>
      <Link href="/terms" className="hover:text-ink-700 dark:hover:text-gray-200">Terms of service</Link>
      <span>© {new Date().getFullYear()} Invora</span>
    </footer>
  );
}
