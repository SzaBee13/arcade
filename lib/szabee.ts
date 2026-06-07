import { cookies } from "next/headers";

export type SzaBeeUser = {
  uuid: string;
  id: string;
  email: string;
  display_name: string;
  provider: string;
  email_verified?: boolean | null;
};

type SessionPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: SzaBeeUser;
};

export const SZABEE_BASE_URL = (process.env.SZABEE_OAUTH_BASE_URL || "https://oauth.szabee.me").replace(/\/$/, "");
export const SZABEE_CLIENT_ID = process.env.SZABEE_CLIENT_ID || "";
export const SZABEE_SCOPE = process.env.SZABEE_SCOPE || "openid profile email";
export const SESSION_COOKIE = "szabee_session";

export function getRedirectUri(origin: string): string {
  const raw = process.env.SZABEE_REDIRECT_URI || `${origin}/api/auth/callback`;
  const fixed = raw.replace(/[&?]scope=.*$/, "");
  try {
    const url = new URL(fixed);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return fixed.replace(/[&?]scope=.*$/, "");
  }
}

export function encodeSession(session: SessionPayload): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodeSession(value: string): SessionPayload | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  return decodeSession(raw);
}

export function randomVerifier(length = 64): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
  let output = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const byte of bytes) {
    output += alphabet[byte % alphabet.length];
  }
  return output;
}

export function randomToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Buffer.from(bytes).toString("base64url");
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}
