import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Exact-preview PDF engine: headless Chromium prints /print/[id],
 * which renders the SAME InvoicePreview component as the screen.
 * Calculation still comes from calcInvoice() — only pixels are shared.
 */
async function browserBin(): Promise<string | null> {
  const cands = [
    process.env.CHROME_PATH,
    "/usr/bin/chromium",
    "/usr/bin/brave",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean) as string[];
  for (const c of cands) {
    try {
      await fs.access(c);
      return c;
    } catch { /* next */ }
  }
  return null;
}

export function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `http://127.0.0.1:${process.env.PORT ?? 3000}`;
}

export async function renderPreviewPdf(invoiceId: string): Promise<Buffer> {
  const bin = await browserBin();
  if (!bin) throw new Error("no-chromium");
  const url = `${appBaseUrl()}/print/${invoiceId}`;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inv-pdf-"));
  const out = path.join(dir, "out.pdf");
  try {
    await execFileAsync(
      bin,
      ["--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", `--print-to-pdf=${out}`, "--no-pdf-header-footer", url],
      { timeout: 90000 }
    );
    return await fs.readFile(out);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
