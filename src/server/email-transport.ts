import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
}

export function buildTransport(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.username ? { user: cfg.username, pass: cfg.password } : undefined,
  });
}

export function fromHeader(cfg: Pick<SmtpConfig, "fromAddress" | "fromName">): string {
  return cfg.fromName ? `"${cfg.fromName}" <${cfg.fromAddress}>` : cfg.fromAddress;
}
