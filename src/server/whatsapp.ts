import { promises as fs } from "fs";
import path from "path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { toDataURL } from "qrcode";
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
  sendText(chatId: string, text: string): Promise<{ messageId: string }>;
}

interface Runtime {
  phase: WhatsAppPhase;
  sock: WASocket | null;
  startPromise: Promise<void> | null;
  qr: string | null;
  qrImage: string | null;
  qrIssuedAt: number | null;
  account: string | null;
  lastError: string | null;
  lastChangeAt: number;
  /** Last send/connect activity — used to shut the session down when idle. */
  lastActivityAt: number;
}

const runtime: Runtime = {
  phase: "idle",
  sock: null,
  startPromise: null,
  qr: null,
  qrImage: null,
  qrIssuedAt: null,
  account: null,
  lastError: null,
  lastChangeAt: Date.now(),
  lastActivityAt: Date.now(),
};

/** QR codes rotate quickly; keep the UI honest about stale codes. */
const QR_FRESHNESS_MS = 90 * 1000;

/** Cool-down after a failed start so we never pile up sessions. */
const START_BACKOFF_MS = Number(process.env.WHATSAPP_START_BACKOFF_MS || 90_000);
let lastFailureAt = 0;

/** Delay before a reconnection attempt after a non-terminal disconnect. */
function reconnectMs(): number {
  const parsed = Number(process.env.WHATSAPP_RECONNECT_MS || 15000);
  if (!Number.isFinite(parsed)) return 15000;
  return Math.min(300000, Math.max(0, Math.round(parsed)));
}

/** Silent logger for Baileys (it is very chatty otherwise). */
const logger = pino({ level: "silent" });

function log(level: "info" | "error", message: string, extra: string = "") {
  const line = `[whatsapp] ${message}${extra ? ` ${extra}` : ""}`;
  if (level === "error") console.error(line);
  else console.info(line);
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

/** Baileys multi-file auth persists `creds.json` once a session is linked. */
export async function whatsappSessionExists(): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(sessionPath(), "creds.json"));
    return stat.isFile();
  } catch {
    return false;
  }
}

function readyTimeoutMs(): number {
  const parsed = Number(process.env.WHATSAPP_READY_TIMEOUT_MS ?? 120000);
  if (!Number.isFinite(parsed)) return 120000;
  return Math.min(300000, Math.max(10000, Math.round(parsed)));
}

async function qrImageFor(qr: string): Promise<string | null> {
  try {
    return await toDataURL(qr, { margin: 1, width: 320 });
  } catch (error) {
    log("error", `qr render failed: ${sanitizeWhatsAppError(error)}`);
    return null;
  }
}

function setPhase(phase: WhatsAppPhase, patch: Partial<Runtime> = {}): void {
  Object.assign(runtime, patch, { phase, lastChangeAt: Date.now() });
}

function disconnectCode(error: unknown): number | undefined {
  const output = (error as { output?: { statusCode?: number } } | undefined)?.output;
  return output?.statusCode;
}

function attachHandlers(sock: WASocket, saveCreds: () => Promise<void>): void {
  sock.ev.process(async (events) => {
    try {
      // Persist credentials fully before any close/reconnect is handled so the
      // post-pairing restart (515) always loads the freshly-paired session.
      if (events["creds.update"]) {
        await saveCreds().catch(() => undefined);
      }
      const update = events["connection.update"];
      if (update) {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          runtime.qr = qr;
          runtime.qrImage = await qrImageFor(qr);
          runtime.qrIssuedAt = Date.now();
          setPhase("qr", { lastError: null });
          log("info", "qr issued");
        }
        if (connection === "open") {
          const account = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
          setPhase("ready", { account, qr: null, qrImage: null, qrIssuedAt: null, lastError: null });
          log("info", `ready account=${account ?? "unknown"}`);
        }
        if (connection === "close") {
          const code = disconnectCode(lastDisconnect?.error);
          const loggedOut = code === DisconnectReason.loggedOut;
          if (runtime.sock === sock) runtime.sock = null;
          if (loggedOut) {
            setPhase("failed", { qr: null, qrImage: null, qrIssuedAt: null, lastError: "logged out — connect again to scan the QR" });
            log("error", "logged out");
          } else if (code === DisconnectReason.restartRequired) {
            // Expected right after a successful pairing: WhatsApp asks the client
            // to reconnect with the freshly-paired credentials. Reconnect
            // immediately, bypassing the start cooldown, or the link is
            // invalidated server-side ("Couldn't link device" on the phone).
            setPhase("starting", { qr: null, qrImage: null, qrIssuedAt: null, lastError: null });
            log("info", `restart required (${code}) — reconnecting with saved session`);
            scheduleReconnect(0, true);
          } else {
            setPhase("stopped", { qr: null, qrImage: null, qrIssuedAt: null, lastError: `disconnected (${code ?? "?"})` });
            log("error", `disconnected code=${code ?? "?"} — will reconnect`);
            scheduleReconnect(reconnectMs());
          }
        }
      }
    } catch (error) {
      log("error", `event handler error: ${sanitizeWhatsAppError(error)}`);
    }
  });
}

let reconnectTimer: NodeJS.Timeout | null = null;
function scheduleReconnect(delayMs?: number, bypassCooldown = false): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (runtime.sock || runtime.startPromise) return;
    startClient(bypassCooldown).catch((error: unknown) => {
      log("error", `reconnect attempt failed: ${sanitizeWhatsAppError(error)} — retrying`);
      scheduleReconnect(reconnectMs());
    });
  }, delayMs ?? reconnectMs());
  reconnectTimer.unref?.();
}

function waitForReady(sock: WASocket, timeoutMs: number): Promise<void> {
  if (runtime.phase === "ready") return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const onUpdate = (update: { connection?: string; lastDisconnect?: { error?: unknown } }) => {
      if (update.connection === "open") finish(resolve);
      if (update.connection === "close" && disconnectCode(update.lastDisconnect?.error) === DisconnectReason.loggedOut) {
        finish(() => reject(new Error("WhatsApp session was logged out")));
      }
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sock.ev.off("connection.update", onUpdate);
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => reject(new Error(`WhatsApp not ready after ${Math.round(timeoutMs / 1000)}s`)));
    }, timeoutMs);
    sock.ev.on("connection.update", onUpdate);
  });
}

async function startClient(bypassCooldown = false): Promise<void> {
  // A session that is already up or coming up is reused.
  if (runtime.sock && ["ready", "starting", "qr"].includes(runtime.phase)) {
    if (runtime.startPromise) return runtime.startPromise;
    return;
  }
  if (runtime.startPromise) return runtime.startPromise;
  if (!bypassCooldown && Date.now() - lastFailureAt < START_BACKOFF_MS) {
    throw new Error("WhatsApp is cooling down after a failed start");
  }

  // A failed/stopped socket must be closed before a fresh start.
  if (runtime.sock) {
    try {
      runtime.sock.end(undefined);
    } catch {
      // best effort
    }
    runtime.sock = null;
  }

  setPhase("starting", { lastError: null });
  runtime.startPromise = (async () => {
    try {
      await fs.mkdir(sessionPath(), { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath());
      const version = await fetchLatestBaileysVersion()
        .then((v) => v.version)
        .catch(() => undefined);
      log("info", `starting baileys session=${sessionPath()} version=${version ? version.join(".") : "default"}`);
      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: ["Invora", "Chrome", "1.0.0"],
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });
      runtime.sock = sock;
      attachHandlers(sock, saveCreds);
      await waitForReady(sock, readyTimeoutMs());
      lastFailureAt = 0;
    } catch (error) {
      const message = sanitizeWhatsAppError(error);
      const waitingForQr = runtime.phase === "qr";
      // A QR-scan timeout is not a session failure: it just means the user has
      // not scanned yet. Don't let it poison lastFailureAt, or the post-pairing
      // reconnect would be blocked by the start cooldown.
      if (!waitingForQr) lastFailureAt = Date.now();
      if (!waitingForQr) {
        setPhase("failed", { lastError: message });
        if (runtime.sock) {
          try {
            runtime.sock.end(undefined);
          } catch {
            // best effort
          }
          runtime.sock = null;
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

async function ensureReadyClient(): Promise<WASocket> {
  await startClient(true);
  const sock = runtime.sock;
  if (!sock) throw new Error("WhatsApp session unavailable");
  if (runtime.phase !== "ready") await waitForReady(sock, readyTimeoutMs());
  return sock;
}

/**
 * Run an operation against the ready socket, retrying once with a fresh
 * connection if it drops mid-operation.
 */
async function withReadyClient<T>(op: (sock: WASocket) => Promise<T>): Promise<T> {
  const sock = await ensureReadyClient();
  try {
    return await op(sock);
  } catch (error) {
    const message = sanitizeWhatsAppError(error).toLowerCase();
    if (!/closed|connection|timed out|not ready|unavailable|stream errored/.test(message)) throw error;
    log("error", `session dropped (${message}); reconnecting`);
    try {
      runtime.sock?.end(undefined);
    } catch {
      // best effort
    }
    runtime.sock = null;
    runtime.startPromise = null;
    setPhase("stopped", { lastError: "reconnecting after a dropped session" });
    const fresh = await ensureReadyClient();
    return await op(fresh);
  }
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

/** Start (or resume) the persistent session without blocking the settings UI. */
export async function connectWhatsApp(): Promise<WhatsAppStatus> {
  if (runtime.phase === "ready") return getWhatsAppStatus();
  void startClient().catch((error: unknown) => {
    log("error", `background start failed: ${sanitizeWhatsAppError(error)}`);
  });
  return getWhatsAppStatus();
}

/** Close the socket but keep the persisted session for fast reconnects. */
export async function disconnectWhatsApp(): Promise<WhatsAppStatus> {
  const sock = runtime.sock;
  runtime.sock = null;
  runtime.startPromise = null;
  if (sock) {
    try {
      sock.end(undefined);
    } catch (error) {
      log("error", `disconnect failed: ${sanitizeWhatsAppError(error)}`);
    }
  }
  setPhase("stopped", { qr: null, qrImage: null, qrIssuedAt: null });
  log("info", "disconnected by user");
  return getWhatsAppStatus();
}

/** Log out and delete persisted session files, forcing a fresh QR. */
export async function resetWhatsAppSession(): Promise<WhatsAppStatus> {
  const sock = runtime.sock;
  runtime.sock = null;
  runtime.startPromise = null;
  if (sock) {
    try {
      await sock.logout();
    } catch {
      // best effort
    }
    try {
      sock.end(undefined);
    } catch {
      // best effort
    }
  }
  await fs.rm(sessionPath(), { recursive: true, force: true }).catch(() => undefined);
  setPhase("stopped", { qr: null, qrImage: null, qrIssuedAt: null });
  log("info", "session reset");
  return getWhatsAppStatus();
}

/**
 * Self-healing reconciler (called by the cron worker). Ensures the session is
 * connected when a saved session exists, without hammering the socket.
 */
export async function reconcileWhatsApp(): Promise<{ phase: WhatsAppPhase; action: string }> {
  const idleMs = Number(process.env.WHATSAPP_IDLE_SHUTDOWN_MS || 0);
  if (idleMs > 0) {
    if (runtime.phase === "ready" && !runtime.startPromise && Date.now() - runtime.lastActivityAt > idleMs) {
      await disconnectWhatsApp();
      return { phase: runtime.phase, action: "idle-shutdown" };
    }
    return { phase: runtime.phase, action: "lazy" };
  }
  if (runtime.phase === "ready") return { phase: runtime.phase, action: "none" };
  if (runtime.startPromise) return { phase: runtime.phase, action: "starting" };
  if (Date.now() - lastFailureAt < START_BACKOFF_MS) return { phase: runtime.phase, action: "cooldown" };
  if (!(await whatsappSessionExists())) return { phase: runtime.phase, action: "no-session" };
  void startClient().catch((error: unknown) => {
    log("error", `reconcile start failed: ${sanitizeWhatsAppError(error)}`);
  });
  return { phase: runtime.phase, action: "start" };
}

class BaileysGateway implements WhatsAppGateway {
  async ensureReady(): Promise<{ account: string | null }> {
    await ensureReadyClient();
    runtime.lastActivityAt = Date.now();
    return { account: runtime.account };
  }

  async resolveChatId(digits: string): Promise<string | null> {
    const sock = await ensureReadyClient();
    const fallback = `${digits}@s.whatsapp.net`;
    try {
      const results = await sock.onWhatsApp(digits);
      const hit = results?.find((r) => r.exists);
      return hit?.jid ?? null;
    } catch (error) {
      log("error", `number lookup failed: ${sanitizeWhatsAppError(error)}`);
      return fallback;
    }
  }

  async sendDocument(doc: WhatsAppDocument): Promise<{ messageId: string }> {
    return withReadyClient(async (sock) => {
      const message = await sock.sendMessage(doc.chatId, {
        document: doc.pdf,
        mimetype: "application/pdf",
        fileName: doc.filename,
        caption: doc.caption,
      });
      runtime.lastActivityAt = Date.now();
      const messageId = message?.key?.id ?? `${doc.chatId}:${Date.now()}`;
      return { messageId };
    });
  }

  async sendText(chatId: string, text: string): Promise<{ messageId: string }> {
    return withReadyClient(async (sock) => {
      const message = await sock.sendMessage(chatId, { text });
      runtime.lastActivityAt = Date.now();
      const messageId = message?.key?.id ?? `${chatId}:${Date.now()}`;
      return { messageId };
    });
  }
}

export const whatsappGateway: WhatsAppGateway = new BaileysGateway();