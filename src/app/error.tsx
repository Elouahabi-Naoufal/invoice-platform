"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[invora-error]", error.message, "digest:", error.digest);
  }, [error]);
  return (
    <div className="mx-auto grid max-w-md gap-4 py-20 text-center">
      <h1 className="page-title">Something went wrong</h1>
      <pre className="rounded bg-red-50 p-3 text-left text-[12px] text-red-800 dark:bg-red-900/20 dark:text-red-200">
        {error.message || "No error message available."}
        {error.digest && <><br /><br />Digest: <code>{error.digest}</code></>}
      </pre>
      <div className="flex justify-center gap-2">
        <button onClick={() => reset()} className="btn-primary">Try again</button>
        <a href="/" className="btn-outline">Back to dashboard</a>
      </div>
    </div>
  );
}
