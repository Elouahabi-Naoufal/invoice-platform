/**
 * Email delivery via SMTP (nodemailer). Optional: only active when SMTP_HOST is set.
 */
import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

export function emailConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

function transporter(): Transporter {
  if (cached) return cached;
  const port = Number(process.env.SMTP_PORT || 587);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return cached;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!emailConfigured()) throw new Error("Email is not configured (SMTP_HOST missing)");
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@invora.app";
  await transporter().sendMail({ from, to, subject, text });
}