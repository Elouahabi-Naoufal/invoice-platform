"use client";
import { useState } from "react";

export default function SupportKeyDisplay({ supportKey }: { supportKey: string }) {
  const [revealed, setRevealed] = useState(false);
  if (!supportKey) return <p className="meta">No support key configured.</p>;
  return (
    <div>
      <p className="meta mb-2">Share this key with support to give them access to your data.</p>
      {revealed ? (
        <code className="block rounded bg-ink-100 p-2 text-[13px] dark:bg-white/10">{supportKey}</code>
      ) : (
        <button onClick={() => setRevealed(true)} className="btn-ghost btn-sm">Reveal support key</button>
      )}
    </div>
  );
}