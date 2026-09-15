"use client";
import { MessageCircle } from "lucide-react";
import { whatsAppShareUrl } from "@/domain/invoice";

export default function PublicShare({ label, total }: { label: string; total: string }) {
  const href = typeof window === "undefined" ? "#" : whatsAppShareUrl(`${label} — ${window.location.href}`);
  return (
    <a href={href} target="_blank" rel="noreferrer" className="btn-outline btn-sm">
      <MessageCircle size={14} /> Partager sur WhatsApp
    </a>
  );
}
