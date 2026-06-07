import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/szabee";
import {
  createRoom,
  joinRoom,
  applyAction,
  getRoom,
  removePlayer,
  serializeRoom,
} from "@/lib/barricade-room";
import { other } from "@/lib/barricade-engine";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function authedPlayer() {
  const session = await getSession();
  return session?.user
    ? { id: session.user.uuid, name: session.user.display_name }
    : null;
}

export async function POST(req: NextRequest) {
  const player = await authedPlayer();
  if (!player) {
    return bad("Authentication required.", 401);
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    roomId?: string;
  };

  try {
    if (body.action === "create") {
      const room = createRoom(player.id, player.name, body.roomId);
      return NextResponse.json(serializeRoom(room, "A"));
    }

    if (body.action === "join") {
      if (!body.roomId) return bad("roomId required.");
      const room = joinRoom(body.roomId, player.id, player.name);
      const side = room.players.find((p) => p.id === player.id)!.side;
      return NextResponse.json(serializeRoom(room, side));
    }

    if (body.action === "move" || body.action === "wall") {
      if (!body.roomId) return bad("roomId required.");
      const room = applyAction(body.roomId, player.id, body as any);
      const side = room.players.find((p) => p.id === player.id)!.side;
      return NextResponse.json(serializeRoom(room, side));
    }

    if (body.action === "leave") {
      if (!body.roomId) return bad("roomId required.");
      removePlayer(body.roomId, player.id);
      return NextResponse.json({ ok: true });
    }

    return bad("Unknown action.");
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error.");
  }
}

export async function GET(req: NextRequest) {
  const player = await authedPlayer();
  if (!player) {
    return bad("Authentication required.", 401);
  }

  const roomId = req.nextUrl.searchParams.get("roomId");
  if (!roomId) return bad("roomId required.");

  const room = getRoom(roomId);
  if (!room) return bad("Room not found.", 404);

  const side = room.players.find((p) => p.id === player.id)?.side;
  if (!side) return bad("You are not in this room.", 403);

  return NextResponse.json(serializeRoom(room, side));
}

export async function DELETE(req: NextRequest) {
  const player = await authedPlayer();
  if (!player) {
    return bad("Authentication required.", 401);
  }

  const roomId = req.nextUrl.searchParams.get("roomId");
  if (!roomId) return bad("roomId required.");

  removePlayer(roomId, player.id);
  return NextResponse.json({ ok: true });
}
