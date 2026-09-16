"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto grid max-w-md gap-4 py-20 text-center">
      <h1 className="page-title">Something went wrong</h1>
      <p className="text-[13px] text-ink-500 dark:text-stone-400">
        {error.message || "An unexpected error occurred while rendering this page."}
      </p>
      <div className="flex justify-center gap-2">
        <button onClick={() => reset()} className="btn-primary">Try again</button>
        <a href="/" className="btn-outline">Back to dashboard</a>
      </div>
    </div>
  );
}
