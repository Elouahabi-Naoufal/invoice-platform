import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "../crypto";

process.env.JWT_SECRET ||= "test-secret-at-least-32-characters-long";

describe("secret encryption", () => {
  it("round-trips without exposing the plaintext", () => {
    const enc = encryptSecret("my-app-password");
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc).not.toContain("my-app-password");
    expect(decryptSecret(enc)).toBe("my-app-password");
  });

  it("returns null for invalid payloads", () => {
    expect(decryptSecret("garbage")).toBeNull();
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret("v1:not:base64:data")).toBeNull();
  });
});
