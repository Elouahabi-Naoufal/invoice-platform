import { SignJWT, jwtVerify } from "jose";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be 32+ chars");
  return new TextEncoder().encode(s);
}

export interface GoogleConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  configured: boolean;
}

export function googleConfig(): GoogleConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/api/email/google/callback`;
  return { clientId, clientSecret, redirectUri, configured: Boolean(clientId && clientSecret && redirectUri.startsWith("http")) };
}

/** Short-lived signed state carrying the owner id (CSRF protection for the callback). */
export async function createOAuthState(ownerId: string): Promise<string> {
  return new SignJWT({ sub: ownerId, purpose: "google-oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function verifyOAuthState(state: string): Promise<string> {
  const { payload } = await jwtVerify(state, secret());
  if (payload.purpose !== "google-oauth" || !payload.sub) throw new Error("invalid state");
  return payload.sub as string;
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = googleConfig();
  if (!clientId || !redirectUri) throw new Error("Google OAuth is not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Google OAuth is not configured");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as GoogleTokens;
}

/** Read the authorized account's email address. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}
