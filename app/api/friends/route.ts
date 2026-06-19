import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/szabee";
import {
  getFriends,
  addFriend,
  removeFriend,
  getPendingForUser,
  getSentRequests,
  sendRequest,
  acceptRequest,
  declineRequest,
} from "@/lib/friends/store";
import { getOrCreateUser } from "@/lib/user-store";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function authed() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function POST(req: NextRequest) {
  const auth = await authed();
  if (!auth) return bad("Authentication required.", 401);

  const me = getOrCreateUser(auth.uuid, auth.email);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    uuid?: string;
    requestId?: string;
  };

  try {
    if (body.action === "request") {
      if (!body.uuid) return bad("Target uuid required.");
      if (body.uuid === auth.uuid) return bad("Cannot send friend request to yourself.");
      getOrCreateUser(body.uuid, "");
      sendRequest(auth.uuid, me.username || auth.uuid, me.nickname || me.username, body.uuid);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "accept") {
      if (!body.requestId) return bad("requestId required.");
      const req = acceptRequest(body.requestId);
      if (!req) return bad("Request not found or already processed.");
      addFriend(req.fromUuid, {
        uuid: auth.uuid,
        username: me.username || auth.uuid,
        nickname: me.nickname || me.username,
        addedAt: Date.now(),
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "decline") {
      if (!body.requestId) return bad("requestId required.");
      const req = declineRequest(body.requestId);
      if (!req) return bad("Request not found.");
      return NextResponse.json({ ok: true });
    }

    if (body.action === "remove") {
      if (!body.uuid) return bad("uuid required.");
      removeFriend(auth.uuid, body.uuid);
      return NextResponse.json({ ok: true });
    }

    return bad("Unknown action.");
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error.");
  }
}

export async function GET() {
  const auth = await authed();
  if (!auth) return bad("Authentication required.", 401);

  const friends = getFriends(auth.uuid);
  const incoming = getPendingForUser(auth.uuid);
  const sent = getSentRequests(auth.uuid);

  return NextResponse.json({ friends, incoming, sent });
}
