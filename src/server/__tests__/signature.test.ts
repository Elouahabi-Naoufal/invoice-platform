import { describe, it, expect } from "vitest";
import { processSignatureImage } from "@/server/companies-clients";

async function stamp(): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  // white paper + dark navy stamp block
  const bg = sharp({ create: { width: 480, height: 200, channels: 3, background: { r: 255, g: 255, b: 255 } } });
  const ink = Buffer.from(
    `<svg width="480" height="200"><rect x="120" y="60" width="240" height="80" fill="#1a2a6b"/></svg>`
  );
  return bg.composite([{ input: ink }]).png().toBuffer();
}

describe("signature pipeline", () => {
  it("makes paper transparent, keeps ink opaque", async () => {
    const out = await processSignatureImage(await stamp(), "image/png");
    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    const at = (x: number, y: number) => data[(y * info.width + x) * 4 + 3]!;
    expect(at(5, 5)).toBe(0); // paper corner → transparent
    expect(at(240, 100)).toBe(255); // ink center → opaque
  });

  it("rejects garbage with a clear message", async () => {
    await expect(processSignatureImage(Buffer.from("not-an-image"), "image/png")).rejects.toThrow(/PNG or JPEG/);
  });
});
