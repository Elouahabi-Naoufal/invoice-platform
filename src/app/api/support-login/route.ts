import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 400 });

  const supportKey = process.env.SUPPORT_KEY;
  if (!supportKey) return new Response("Support not configured", { status: 403 });

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) throw new Error("invalid format");

    const [version, adminId, expiryStr, sig] = parts;
    if (version !== "v1") throw new Error("unknown version");

    const expiry = Number(expiryStr);
    if (Date.now() > expiry) throw new Error("token expired");

    const payload = `${version}:${adminId}:${expiry}`;
    const expectedSig = crypto.createHmac("sha256", supportKey).update(payload).digest("hex").slice(0, 16);
    if (sig !== expectedSig) throw new Error("invalid signature");

    // Set support session cookie
    const cookie = await cookies();
    cookie.set("support_session", adminId, {
      expires: new Date(expiry),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });

    redirect("/");
  } catch (e) {
    return new Response(`Support login failed: ${e instanceof Error ? e.message : "error"}`, { status: 403 });
  }
}