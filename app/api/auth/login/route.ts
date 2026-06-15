import { NextRequest, NextResponse } from "next/server";
import {
  SZABEE_BASE_URL,
  SZABEE_CLIENT_ID,
  SZABEE_SCOPE,
  createCodeChallenge,
  getRedirectUri,
  randomToken,
  randomVerifier,
} from "@/lib/szabee";

const STATE_COOKIE = "szabee_oauth_state";
const VERIFIER_COOKIE = "szabee_oauth_verifier";
const RETURN_TO_COOKIE = "arcade_auth_return_to";

function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

export async function GET(request: NextRequest) {
  if (!SZABEE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Missing SZABEE_CLIENT_ID. Set it in .env.local." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const origin = url.origin;
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const state = randomToken(24);
  const verifier = randomVerifier(96);
  const challenge = await createCodeChallenge(verifier);

  const authUrl = new URL(`${SZABEE_BASE_URL}/oauth2/authorize`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", SZABEE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", getRedirectUri(origin));
  authUrl.searchParams.set("scope", SZABEE_SCOPE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const secureCookie = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: 60 * 10,
    path: "/",
  });
  response.cookies.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: 60 * 10,
    path: "/",
  });
  if (returnTo) {
    response.cookies.set(RETURN_TO_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      maxAge: 60 * 10,
      path: "/",
    });
  }

  return response;
}
