import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/szabee";
import { getOrCreateUser } from "@/lib/user-store";
import { createInvite, getPendingInvites, clearInvite } from "@/lib/invite-store";

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
    toUuid?: string;
    roomId?: string;
    game?: string;
    inviteId?: string;
  };

  try {
    if (body.action === "send") {
      if (!body.toUuid || !body.roomId) return bad("toUuid and roomId required.");
      const invite = createInvite(
        auth.uuid,
        me.username || me.nickname || auth.uuid,
        body.toUuid,
        body.roomId,
        body.game || "barricade",
      );
      return NextResponse.json({ invite });
    }

    if (body.action === "clear") {
      if (!body.inviteId) return bad("inviteId required.");
      clearInvite(body.inviteId);
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

  const invites = getPendingInvites(auth.uuid);
  return NextResponse.json({ invites });
}
