#!/usr/bin/env node
/**
 * Patch whatsapp-web.js for a known bug in the installed version (1.34.7):
 * `framenavigated` fires for every frame (including iframes and SPA navigations)
 * and unconditionally re-runs `inject()`. This causes duplicate `authenticated`
 * events and prevents the `ready` event from ever firing — the client hangs at
 * "authenticated" and times out.
 *
 * Upstream fix: wwebjs/whatsapp-web.js PR #201653 (merged after 1.34.7).
 * This script is idempotent and safe to run on every install/build.
 */
const fs = require("fs");
const path = require("path");

const MARKER = "wwjs-patched-framenavigated";
const candidates = [
  path.join(process.cwd(), "node_modules", "whatsapp-web.js", "src", "Client.js"),
  path.join(__dirname, "..", "node_modules", "whatsapp-web.js", "src", "Client.js"),
];

const original = `        this.pupPage.on('framenavigated', async (frame) => {
            if (frame.url().includes('post_logout=1') || this.lastLoggedOut) {
                this.emit(Events.DISCONNECTED, 'LOGOUT');
                await this.authStrategy.logout();
                await this.authStrategy.beforeBrowserInitialized();
                await this.authStrategy.afterBrowserInitialized();
                this.lastLoggedOut = false;
            }
            await this.inject();
        });`;

const patched = `        // ${MARKER}: only main-frame navigations may re-inject, and never
        // concurrently — otherwise inject() races wipe window.WWebJS and the
        // 'ready' event never fires (upstream PR #201653).
        this._wwjsInjectInProgress = false;
        this.pupPage.on('framenavigated', async (frame) => {
            if (typeof frame.parentFrame === 'function' && frame.parentFrame() !== null) return;
            if (frame.url().includes('post_logout=1') || this.lastLoggedOut) {
                this.emit(Events.DISCONNECTED, 'LOGOUT');
                await this.authStrategy.logout();
                await this.authStrategy.beforeBrowserInitialized();
                await this.authStrategy.afterBrowserInitialized();
                this.lastLoggedOut = false;
            }
            if (this._wwjsInjectInProgress) return;
            this._wwjsInjectInProgress = true;
            try {
                await this.inject();
            } finally {
                this._wwjsInjectInProgress = false;
            }
        });`;

for (const file of candidates) {
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, "utf8");
  if (src.includes(MARKER)) {
    console.log(`[patch-whatsapp-web] already patched: ${file}`);
    process.exit(0);
  }
  if (!src.includes(original)) {
    console.warn(`[patch-whatsapp-web] expected snippet not found (version changed?) — skipping: ${file}`);
    continue;
  }
  src = src.replace(original, patched);
  fs.writeFileSync(file, src);
  console.log(`[patch-whatsapp-web] patched: ${file}`);
  process.exit(0);
}

console.warn("[patch-whatsapp-web] whatsapp-web.js Client.js not found — nothing to patch.");
process.exit(0);
