import { describe, it, expect } from "vitest";
import { waDigits, whatsAppShareUrl, invoiceShareText } from "../invoice";

describe("whatsapp share", () => {
  it("normalizes Moroccan numbers", () => {
    expect(waDigits("+212 661-234567")).toBe("212661234567");
    expect(waDigits("0661234567")).toBe("212661234567");
    expect(waDigits("0033612345678")).toBe("33612345678");
    expect(waDigits(null)).toBeNull();
    expect(waDigits("123")).toBeNull();
  });

  it("builds share URLs", () => {
    expect(whatsAppShareUrl("hi", "0661234567")).toBe("https://wa.me/212661234567?text=hi");
    expect(whatsAppShareUrl("hi", null)).toBe("https://wa.me/?text=hi");
  });

  it("builds invoice messages", () => {
    const t = invoiceShareText({ docType: "FACTURE", number: "FAC-2026-1", totalTTC: 12000, currency: "MAD", seller: "S", url: "https://x/i/abc" });
    expect(t).toContain("facture FAC-2026-1");
    expect(t).toContain("https://x/i/abc");
  });
});
