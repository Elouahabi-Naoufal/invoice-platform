"use client";
import { useRouter } from "next/navigation";

export default function InvoiceRow({ id, children }: { id: string; children: React.ReactNode }) {
  const r = useRouter();
  return (
    <tr
      onClick={() => r.push(`/invoices/${id}`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); r.push(`/invoices/${id}`); } }}
      tabIndex={0}
      className="cursor-pointer"
      title="Open invoice"
    >
      {children}
    </tr>
  );
}
