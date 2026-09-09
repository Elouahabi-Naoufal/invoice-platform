import { describe, it, expect } from "vitest";
import { isValidICE, amountInWords, frIntToWords } from "../invoice";

describe("Morocco guards", () => {
  it("ICE: 15 digits + Mod97", () => {
    expect(isValidICE(null)).toBe(false);
    expect(isValidICE("123")).toBe(false);
    expect(isValidICE("123456789012345")).toBe(false); // bad checksum (most likely)
    // construct a valid one: find check digits for a base (deterministic)
    const base = "1234567890123"; // 13 digits
    let valid = "";
    for (let i = 0; i < 100; i++) {
      const cand = base + String(i).padStart(2, "0");
      if (isValidICE(cand)) { valid = cand; break; }
    }
    expect(valid).toMatch(/^\d{15}$/);
    expect(isValidICE(valid)).toBe(true);
  });

  it("frIntToWords basics", () => {
    expect(frIntToWords(0)).toBe("zéro");
    expect(frIntToWords(1)).toBe("un");
    expect(frIntToWords(21)).toBe("vingt-et-un");
    expect(frIntToWords(71)).toBe("soixante-et-onze");
    expect(frIntToWords(80)).toBe("quatre-vingts");
    expect(frIntToWords(100)).toBe("cent");
    expect(frIntToWords(1000)).toBe("mille");
    expect(frIntToWords(1200)).toBe("mille deux cents");
  });

  it("amountInWords MAD", () => {
    expect(amountInWords(120000, "MAD")).toBe(
      "Arrêté la présente facture à la somme de mille deux cents dirhams."
    );
    expect(amountInWords(119950, "MAD")).toContain("centimes");
  });
});
