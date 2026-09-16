import { NextResponse } from "next/server";
import { requireWrite } from "@/server/auth";
import { buildGoogleAuthUrl, createOAuthState, googleConfig } from "@/server/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return NextResponse.redirect(`${base}${path}`);
}

/** Start the Google OAuth flow to connect the owner's Gmail. */
export async function GET() {
  let ownerId: string;
  try {
    ownerId = (await requireWrite()).ownerId;
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  if (!googleConfig().configured) return back("/settings/email?error=google_not_configured");
  const state = await createOAuthState(ownerId);
  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
