import { chromium } from "playwright";

const BASE = "https://invoice.naoufalelouahabi.com";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

try {
  console.log("1) goto admin-login");
  await page.goto(`${BASE}/admin-login`, { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[name="email"]', "admin@invora.app");
  await page.fill('input[name="password"]', "Admin12345");
  await Promise.all([page.waitForURL("**/admin", { timeout: 30000 }).catch(() => {}), page.click('button[type="submit"]')]);
  console.log("   url:", page.url());

  console.log("2) dashboard");
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle", timeout: 45000 });
  await page.screenshot({ path: "/tmp/opencode/shot-dashboard.png", fullPage: true });
  console.log("   h1:", await page.locator("h1").first().textContent());

  console.log("3) registrations");
  await page.goto(`${BASE}/admin/registrations`, { waitUntil: "networkidle", timeout: 45000 });
  const rows = await page.locator("table.tbl tbody tr").count();
  console.log("   rows:", rows);
  for (let i = 0; i < rows; i++) {
    console.log("   -", (await page.locator("table.tbl tbody tr").nth(i).innerText()).replace(/\n/g, " | "));
  }
  await page.screenshot({ path: "/tmp/opencode/shot-registrations.png", fullPage: true });

  console.log("4) tenants");
  await page.goto(`${BASE}/admin/tenants`, { waitUntil: "networkidle", timeout: 45000 });
  const trows = await page.locator("table.tbl tbody tr").count();
  console.log("   rows:", trows);
  for (let i = 0; i < trows; i++) {
    console.log("   -", (await page.locator("table.tbl tbody tr").nth(i).innerText()).replace(/\n/g, " | "));
  }
  await page.screenshot({ path: "/tmp/opencode/shot-tenants.png", fullPage: true });
} catch (e) {
  console.log("FAILED:", e.message);
  await page.screenshot({ path: "/tmp/opencode/shot-fail.png", fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}
