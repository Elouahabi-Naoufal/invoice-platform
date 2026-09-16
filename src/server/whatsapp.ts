import { existsSync, promises as fs } from "fs";
import path from "path";
import type { Client } from "whatsapp-web.js";
import { sanitizeWhatsAppError } from "@/server/whatsapp-message";

export type WhatsAppPhase = "idle" | "starting" | "qr" | "ready" | "failed" | "stopped";

export interface WhatsAppStatus {
  phase: WhatsAppPhase;
  connected: boolean;
  qrImage: string | null;
  qrAgeMs: number | null;
  qrExpired: boolean;
  account: string | null;
  lastError: string | null;
  sessionExists: boolean;
  lastChangeAt: string;
}

export interface WhatsAppDocument {
  chatId: string;
  caption: string;
  pdf: Buffer;
  filename: string;
}

export interface WhatsAppGateway {
  ensureReady(): Promise<{ account: string | null }>;
  resolveChatId(digits: string): Promise<string | null>;
  sendDocument(doc: WhatsAppDocument): Promise<{ messageId: string }>;
}

interface Runtime {
  phase: WhatsAppPhase;
  client: Client | null;
  startPromise: Promise<void> | null;
  qr: string | null;
  qrImage: string | null;
  qrIssuedAt: number | null;
  account: string | null;
  lastError: string | null;
  lastChangeAt: number;
}

const runtime: Runtime = {
  phase: "idle",
  client: null,
  startPromise: null,
  qr: null,
  qrImage: null,
  qrIssuedAt: null,
  account: null,
  lastError: null,
  lastChangeAt: Date.now(),
};

/** QR codes rotate quickly; keep the UI honest about stale codes. */
const QR_FRESHNESS_MS = 90 * 1000;

function log(level: "info" | "error", message: string, extra: string = "") {
  const line = `[whatsapp] ${message}${extra ? ` ${extra}` : ""}`;
  if (level === "error") console.error(line);
  else console.info(line);
}

/**
 * whatsapp-web.js is imported dynamically so the browser automation stack is
 * only loaded on the server when a WhatsApp route actually needs it.
 * Its optional S3 peer (@aws-sdk/client-s3, used solely by RemoteAuth's S3
 * backend — we use LocalAuth) is aliased to a local stub in next.config.cjs.
 */
async function loadWwebjs(): Promise<typeof import("whatsapp-web.js")> {
  return import("whatsapp-web.js");
}

export function whatsappClientId(): string {
  return process.env.WHATSAPP_CLIENT_ID?.trim() || "invoice-platform";
}

export function whatsappSessionDir(): string {
  const configured = process.env.WHATSAPP_SESSION_DIR?.trim();
  return configured || path.join(process.cwd(), "data", "whatsapp");
}

function sessionPath(): string {
  return path.join(whatsappSessionDir(), `session-${whatsappClientId()}`);
}

export async function whatsappSessionExists(): Promise<boolean> {
  try {
    const stats = await fs.stat(sessionPath());
    if (!stats.isDirectory()) return false;
    return (await fs.readdir(sessionPath())).length > 0;
  } catch {
    return false;
  }
}

function setPhase(phase: WhatsAppPhase, patch: Partial<Runtime> = {}): void {
  Object.assign(runtime, patch, { phase, lastChangeAt: Date.now() });
}

function resolveChromePath(): string | undefined {
  const candidates = [
    process.env.WHATSAPP_CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter((candidate): candidate is string => !!candidate && candidate.trim().length > 0);
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) return candidate;
    } catch {
      // Fall through to the next candidate.
    }
  }
  return undefined;
}

function readyTimeoutMs(): number {
  const parsed = Number(process.env.WHATSAPP_READY_TIMEOUT_MS ?? 120000);
  if (!Number.isFinite(parsed)) return 120000;
  return Math.min(300000, Math.max(10000, Math.round(parsed)));
}

async function qrImageFor(qr: string): Promise<string | null> {
  try {
    const { toDataURL } = await import("qrcode");
    return await toDataURL(qr, { margin: 1, width: 320 });
  } catch (error) {
    log("error", `qr render failed: ${sanitizeWhatsAppError(error)}`);
    return null;
  }
}

function waitForReady(client: Client, timeoutMs: number): Promise<void> {
  if (runtime.phase === "ready") return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poller);
      client.off("ready", onReady);
      client.off("auth_failure", onFailure);
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => reject(new Error(`WhatsApp client not ready after ${Math.round(timeoutMs / 1000)}s`)));
    }, timeoutMs);
    const onReady = () => finish(resolve);
    const onFailure = (message: string) =>
      finish(() => reject(new Error(message || "WhatsApp authentication failed")));
    // Fallback: the `ready` event can be missed on SPA re-injection (known
    // whatsapp-web.js bug). Poll the WhatsApp Web socket state instead.
    const poller = setInterval(() => {
      if (runtime.phase === "ready") {
        finish(resolve);
        return;
      }
      void (async () => {
        try {
          const state = (await client.getState()) as unknown as string | null;
          if (state === "CONNECTED") {
            const info = client.info as Client["info"] | undefined;
            const account = info?.wid?._serialized ?? info?.pushname ?? runtime.account;
            setPhase("ready", { account, qr: null, qrImage: null, qrIssuedAt: null, lastError: null });
            log("info", `ready (state poll) account=${account ?? "unknown"}`);
            finish(resolve);
          }
        } catch {
          // socket not ready yet — keep polling until the timeout
        }
      })();
    }, 3000);
    client.on("ready", onReady);
    client.on("auth_failure", onFailure);
  });
}

function attachHandlers(client: Client): void {
  client.on("qr", (qr: string) => {
    void (async () => {
      runtime.qr = qr;
      runtime.qrImage = await qrImageFor(qr);
      runtime.qrIssuedAt = Date.now();
      setPhase("qr", { lastError: null });
      log("info", "qr issued");
    })();
  });
  client.on("authenticated", () => {
    setPhase("starting", {});
    log("info", "authenticated");
  });
  client.on("ready", () => {
    const info = client.info as Client["info"] | undefined;
    const account = info?.wid?._serialized ?? info?.pushname ?? null;
    setPhase("ready", {
      account,
      qr: null,
      qrImage: null,
      qrIssuedAt: null,
      lastError: null,
    });
    log("info", `ready account=${account ?? "unknown"}`);
  });
  client.on("auth_failure", (message: string) => {
    const failure = sanitizeWhatsAppError(message || "WhatsApp authentication failed");
    setPhase("failed", { lastError: failure });
    log("error", `auth failure: ${failure}`);
  });
  client.on("disconnected", (reason: unknown) => {
    const detail = typeof reason === "string" && reason ? reason : "disconnected";
    runtime.client = null;
    runtime.startPromise = null;
    setPhase("stopped", {
      qr: null,
      qrImage: null,
      qrIssuedAt: null,
      lastError: `disconnected: ${detail}`,
    });
    log("error", `disconnected: ${detail}`);
  });
  client.on("change_state", (state: unknown) => {
    log("info", `state ${String(state)}`);
  });
}

async function startClient(): Promise<void> {
  if (runtime.client && runtime.phase === "ready") return;
  if (runtime.startPromise) return runtime.startPromise;

  // whatsapp-web.js initialize() is not idempotent: a previously failed/stopped
  // client must be destroyed and replaced, never re-initialized.
  if (runtime.client && !["ready", "starting", "qr"].includes(runtime.phase)) {
    try {
      await runtime.client.destroy();
    } catch {
      // best effort
    }
    runtime.client = null;
  }

  if (!runtime.client) setPhase("starting", { lastError: null });
  runtime.startPromise = (async () => {
    try {
      await fs.mkdir(whatsappSessionDir(), { recursive: true });
      log(
        "info",
        `starting chrome=${resolveChromePath() ?? "(puppeteer default)"} ` +
          `xdg_config=${process.env.XDG_CONFIG_HOME ?? "(unset)"} ` +
          `xdg_cache=${process.env.XDG_CACHE_HOME ?? "(unset)"}`
      );
      if (!runtime.client) {
        const { Client: WhatsAppClient, LocalAuth } = await loadWwebjs();
        const client = new WhatsAppClient({
          authStrategy: new LocalAuth({ clientId: whatsappClientId(), dataPath: whatsappSessionDir() }),
          authTimeoutMs: readyTimeoutMs(),
          // Always load the current WhatsApp Web build; a stale local cache is a
          // known cause of "authenticated but never ready".
          webVersionCache: { type: "none" },
          puppeteer: {
            headless: process.env.WHATSAPP_HEADLESS !== "false",
            executablePath: resolveChromePath(),
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--disable-software-rasterizer",
              "--no-first-run",
              "--disable-background-timer-throttling",
              "--disable-backgrounding-occluded-windows",
              "--disable-renderer-backgrounding",
            ],
          },
        });
        attachHandlers(client);
        runtime.client = client;
      }
      await runtime.client.initialize();
      await waitForReady(runtime.client, readyTimeoutMs());
    } catch (error) {
      const message = sanitizeWhatsAppError(error);
      // A timeout while a QR is displayed is not fatal: the user may still scan it.
      if (runtime.phase !== "qr" && runtime.phase !== "ready") {
        setPhase("failed", { lastError: message });
        // Discard the stuck browser so the next attempt starts a fresh client.
        if (runtime.client) {
          try {
            await runtime.client.destroy();
          } catch {
            // best effort
          }
          runtime.client = null;
        }
      }
      log("error", `start failed: ${message}`);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      runtime.startPromise = null;
    }
  })();

  return runtime.startPromise;
}

async function ensureReadyClient(): Promise<Client> {
  await startClient();
  const client = runtime.client;
  if (!client) throw new Error("WhatsApp client unavailable");
  if (runtime.phase !== "ready") await waitForReady(client, readyTimeoutMs());
  return client;
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const now = Date.now();
  const qrAgeMs = runtime.qrIssuedAt ? now - runtime.qrIssuedAt : null;
  return {
    phase: runtime.phase,
    connected: runtime.phase === "ready",
    qrImage: runtime.phase === "qr" ? runtime.qrImage : null,
    qrAgeMs,
    qrExpired: qrAgeMs != null && qrAgeMs > QR_FRESHNESS_MS,
    account: runtime.account,
    lastError: runtime.lastError,
    sessionExists: await whatsappSessionExists(),
    lastChangeAt: new Date(runtime.lastChangeAt).toISOString(),
  };
}

/** Start (or resume) the persistent client without blocking the settings UI. */
export async function connectWhatsApp(): Promise<WhatsAppStatus> {
  if (runtime.phase === "ready") return getWhatsAppStatus();
  void startClient().catch((error: unknown) => {
    log("error", `background start failed: ${sanitizeWhatsAppError(error)}`);
  });
  return getWhatsAppStatus();
}

/** Close the browser but keep the persisted LocalAuth session for fast reconnects. */
export async function disconnectWhatsApp(): Promise<WhatsAppStatus> {
  const client = runtime.client;
  runtime.client = null;
  runtime.startPromise = null;
  if (client) {
    try {
      await client.destroy();
    } catch (error) {
      log("error", `disconnect failed: ${sanitizeWhatsAppError(error)}`);
    }
  }
  setPhase("stopped", { qr: null, qrImage: null, qrIssuedAt: null });
  log("info", "disconnected by user");
  return getWhatsAppStatus();
}

/** Destroy the client and delete persisted session files, forcing a fresh QR. */
export async function resetWhatsAppSession(): Promise<WhatsAppStatus> {
  const client = runtime.client;
  runtime.client = null;
  runtime.startPromise = null;
  if (client) {
    try {
      await client.logout();
    } catch {
      try {
        await client.destroy();
      } catch (error) {
        log("error", `reset destroy failed: ${sanitizeWhatsAppError(error)}`);
      }
    }
  }
  try {
    await fs.rm(sessionPath(), { recursive: true, force: true });
  } catch (error) {
    log("error", `reset cleanup failed: ${sanitizeWhatsAppError(error)}`);
  }
  setPhase("idle", {
    qr: null,
    qrImage: null,
    qrIssuedAt: null,
    account: null,
    lastError: null,
  });
  log("info", "session reset");
  return getWhatsAppStatus();
}

class WwebjsGateway implements WhatsAppGateway {
  async ensureReady(): Promise<{ account: string | null }> {
    await ensureReadyClient();
    return { account: runtime.account };
  }

  async resolveChatId(digits: string): Promise<string | null> {
    const client = await ensureReadyClient();
    const chatId = `${digits}@c.us`;
    try {
      const registered = await client.isRegisteredUser(chatId);
      if (!registered) return null;
    } catch (error) {
      log("error", `registration check failed: ${sanitizeWhatsAppError(error)}`);
      return chatId;
    }
    try {
      const contact = (await client.getNumberId(digits)) as unknown as { _serialized?: string } | null;
      return contact?._serialized ?? chatId;
    } catch (error) {
      log("error", `number lookup failed: ${sanitizeWhatsAppError(error)}`);
      return chatId;
    }
  }

  async sendDocument(doc: WhatsAppDocument): Promise<{ messageId: string }> {
    const client = await ensureReadyClient();
    const { MessageMedia } = await loadWwebjs();
    const media = new MessageMedia("application/pdf", doc.pdf.toString("base64"), doc.filename, doc.pdf.length);
    const message = await client.sendMessage(doc.chatId, media, {
      sendMediaAsDocument: true,
      caption: doc.caption,
    });
    const id = message?.id as unknown as { _serialized?: string } | string | undefined;
    const messageId = typeof id === "string" ? id : (id?._serialized ?? `${doc.chatId}:${Date.now()}`);
    return { messageId };
  }
}

export const whatsappGateway: WhatsAppGateway = new WwebjsGateway();
