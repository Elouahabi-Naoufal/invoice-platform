import { describe, it, expect } from "vitest";
import { processLogoImage, logoDataUri } from "@/server/companies-clients";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

async function makeImg(format: "png" | "jpeg" | "webp", w = 900, h = 300) {
  const { default: sharp } = await import("sharp");
  const base = sharp({
    create: { width: w, height: h, channels: 3, background: { r: 29, g: 78, b: 216 } },
  });
  if (format === "png") return base.png().toBuffer();
  if (format === "jpeg") return base.jpeg().toBuffer();
  return base.webp().toBuffer();
}

describe("logo pipeline", () => {
  it("normalizes PNG/JPEG/WebP to PDF-safe PNG (≤480px, ≤2MB)", async () => {
    for (const f of ["png", "jpeg", "webp"] as const) {
      const raw = await makeImg(f);
      const out = await processLogoImage(raw, `image/${f}`);
      expect(out.subarray(1, 4).toString()).toBe("PNG"); // PNG signature
      expect(out.length).toBeLessThanOrEqual(2 * 1024 * 1024);
      const meta = await (await import("sharp")).default(out).metadata();
      expect(meta.width).toBeLessThanOrEqual(480);
    }
  });

  it("rejects garbage with a clear message", async () => {
    await expect(processLogoImage(Buffer.from("not-an-image"), "image/png")).rejects.toThrow(/PNG or JPEG/);
  });

  it("logoDataUri resolves a stored file, guards traversal", async () => {
    const dir = join(process.cwd(), "public", "uploads", "logos");
    mkdirSync(dir, { recursive: true });
    const png = await processLogoImage(await makeImg("jpeg"), "image/jpeg");
    writeFileSync(join(dir, "probe.png"), png);
    const uri = await logoDataUri("/uploads/logos/probe.png");
    expect(uri?.startsWith("data:image/png;base64,")).toBe(true);
    expect(await logoDataUri("/etc/passwd")).toBeNull();
    expect(await logoDataUri("../../package.json")).toBeNull();
  });
});
