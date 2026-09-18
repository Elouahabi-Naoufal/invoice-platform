import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySupportToken } from "@/server/support-token";

export const dynamic = "force-dynamic";

const COOKIE = "support_token";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 400 });

  const supportKey = process.env.SUPPORT_KEY;
  if (!supportKey) return new Response("Support access is not enabled on this instance", { status: 403 });

  try {
    const { adminId, expiry } = verifySupportToken(supportKey, token);
    const cookie = await cookies();
    cookie.set(COOKIE, token, {
      expires: new Date(expiry),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    console.info(`[support] session started by ${adminId}`);
  } catch (e) {
    return new Response(`Support login failed: ${e instanceof Error ? e.message : "error"}`, { status: 403 });
  }

  redirect("/");
}

export async function DELETE() {
  (await cookies()).delete(COOKIE);
  return new Response("Support session ended", { status: 200 });
}