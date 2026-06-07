import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/szabee";
import {
  getOrCreateUser,
  setUsername,
  setProfile,
  canChangeUsername,
  getUserByUuid,
  fillFromCookies,
} from "@/lib/user-store";

const COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 365 };

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function authed() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function GET() {
  const auth = await authed();
  if (!auth) return bad("Authentication required.", 401);
  const user = getOrCreateUser(auth.uuid, auth.email);
  const cookieStore = await cookies();
  fillFromCookies(user, cookieStore);
  const check = canChangeUsername(auth.uuid);
  return NextResponse.json({ user, canChange: check.ok, cooldown: check.remainingDays });
}

export async function POST(req: NextRequest) {
  const auth = await authed();
  if (!auth) return bad("Authentication required.", 401);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    username?: string;
    nickname?: string;
    bio?: string;
  };

  try {
    getOrCreateUser(auth.uuid, auth.email);

    if (body.action === "set-username") {
      if (!body.username || body.username.length < 2) {
        return bad("Username must be at least 2 characters.");
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(body.username)) {
        return bad("Username can only contain letters, numbers, hyphens, and underscores.");
      }
      const check = canChangeUsername(auth.uuid);
      if (!check.ok) {
        return bad(`Username can be changed in ${check.remainingDays} day(s).`);
      }
      const user = setUsername(auth.uuid, body.username);
      const res = NextResponse.json({ user });
      res.cookies.set("arcade_onboarded", "1", COOKIE_OPTS);
      res.cookies.set("arcade_username", user.username, COOKIE_OPTS);
      return res;
    }

    if (body.action === "set-profile") {
      const user = setProfile(auth.uuid, body.nickname || "", body.bio || "");
      const res = NextResponse.json({ user });
      if (user.nickname) res.cookies.set("arcade_nickname", user.nickname, COOKIE_OPTS);
      if (user.bio) res.cookies.set("arcade_bio", user.bio, COOKIE_OPTS);
      return res;
    }

    return bad("Unknown action.");
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error.");
  }
}
