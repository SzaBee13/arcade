import { NextResponse } from "next/server";
import { createFriendInviteLink } from "@/lib/friends/store";
import { getSession } from "@/lib/szabee";
import { getOrCreateUser } from "@/lib/user-store";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) return bad("Authentication required.", 401);

  const user = getOrCreateUser(session.user.uuid, session.user.email);
  if (!user.username) {
    return bad("Set a username before creating friend invite links.");
  }

  const invite = createFriendInviteLink(
    session.user.uuid,
    user.username,
    user.nickname || user.username,
  );
  const origin = new URL(request.url).origin;
  const url = `${origin}/invite/${encodeURIComponent(invite.fromUsername)}/${invite.id}?token=${encodeURIComponent(invite.token)}`;

  return NextResponse.json({ invite: { id: invite.id, url } });
}
