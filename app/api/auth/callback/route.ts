import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SZABEE_BASE_URL,
  SZABEE_CLIENT_ID,
  encodeSession,
  getRedirectUri,
} from "@/lib/szabee";

const STATE_COOKIE = "szabee_oauth_state";
const VERIFIER_COOKIE = "szabee_oauth_verifier";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, requestUrl.origin));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code_or_state", requestUrl.origin));
  }

  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;

  if (!cookieState || cookieState !== state || !verifier) {
    return NextResponse.redirect(new URL("/?auth_error=invalid_oauth_state", requestUrl.origin));
  }

  const tokenResponse = await fetch(`${SZABEE_BASE_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: SZABEE_CLIENT_ID,
      code,
      redirect_uri: getRedirectUri(requestUrl.origin),
      code_verifier: verifier,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/?auth_error=token_exchange_failed", requestUrl.origin));
  }

  const tokenJson = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokenJson.access_token) {
    return NextResponse.redirect(new URL("/?auth_error=missing_access_token", requestUrl.origin));
  }

  const userResponse = await fetch(`${SZABEE_BASE_URL}/user`, {
    headers: {
      authorization: `Bearer ${tokenJson.access_token}`,
    },
    cache: "no-store",
  });

  if (!userResponse.ok) {
    return NextResponse.redirect(new URL("/?auth_error=user_fetch_failed", requestUrl.origin));
  }

  const user = await userResponse.json();
  const encoded = encodeSession({
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    expiresAt: tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : undefined,
    user,
  });

  const secureCookie = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(new URL("/", requestUrl.origin));
  response.cookies.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  response.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(VERIFIER_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
