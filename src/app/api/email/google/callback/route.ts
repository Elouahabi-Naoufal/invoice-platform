import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCodeForTokens, fetchGoogleEmail, verifyOAuthState } from "@/server/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return NextResponse.redirect(`${base}${path}`);
}

/** Google redirects the browser here after consent. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) return back(`/settings/email?error=${encodeURIComponent(error)}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return back("/settings/email?error=missing_code");

  let ownerId: string;
  try {
    ownerId = await verifyOAuthState(state);
  } catch {
    return back("/settings/email?error=invalid_state");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) return back("/settings/email?error=no_refresh_token");
    const email = (await fetchGoogleEmail(tokens.access_token)) ?? "";
    const shared = {
      authType: "GOOGLE",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      username: email || null,
      oauthRefreshTokenEnc: encryptSecret(tokens.refresh_token),
      googleEmail: email || null,
      enabled: true,
    };
    await prisma.emailSettings.upsert({
      where: { ownerId },
      create: { ownerId, ...shared, fromAddress: email || "" },
      update: { ...shared, ...(email ? { fromAddress: email } : {}) },
    });
    return back("/settings/email?connected=google");
  } catch (e) {
    return back(`/settings/email?error=${encodeURIComponent(e instanceof Error ? e.message : "oauth_failed")}`);
  }
}
