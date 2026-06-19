import { randomUUID } from "node:crypto";
import {
  applyMove,
  applyWall,
  createInitialState,
  type BarricadeState,
  type Side,
  other,
  serializeState,
} from "./engine";

export type RoomPlayer = {
  id: string;
  name: string;
  side: Side;
};

export type Room = {
  id: string;
  players: RoomPlayer[];
  state: BarricadeState;
  updatedAt: number;
};

const rooms = new Map<string, Room>();

function buildRoomId(): string {
  return randomUUID().slice(0, 8);
}

export function createRoom(playerId: string, playerName: string, roomId?: string): Room {
  const id = roomId?.trim() || buildRoomId();
  if (rooms.has(id)) {
    throw new Error("Room already exists.");
  }
  const room: Room = {
    id,
    players: [{ id: playerId, name: playerName, side: "A" }],
    state: createInitialState("Room created. Waiting for opponent."),
    updatedAt: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

export function joinRoom(roomId: string, playerId: string, playerName: string): Room {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error("Room not found.");
  }
  if (room.players.length >= 2) {
    throw new Error("Room is full.");
  }
  if (room.players.some((p) => p.id === playerId)) {
    throw new Error("You are already in this room.");
  }
  const usedSides = new Set(room.players.map((p) => p.side));
  const side: Side = usedSides.has("A") ? "B" : "A";
  room.players.push({ id: playerId, name: playerName, side });
  room.state.log = "Both players connected. A starts.";
  room.updatedAt = Date.now();
  return room;
}

export function applyAction(
  roomId: string,
  playerId: string,
  action:
    | { action: "move"; to?: { row: number; col: number } }
    | { action: "wall"; kind?: "h" | "v"; row?: number; col?: number },
): Room {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error("Room not found.");
  }
  if (room.players.length < 2) {
    throw new Error("Waiting for opponent.");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("You are not in this room.");
  }
  if (room.state.winner) {
    throw new Error("Game already ended.");
  }
  if (room.state.turn !== player.side) {
    throw new Error("Not your turn.");
  }

  const next =
    action.action === "move"
      ? action.to && applyMove(room.state, player.side, action.to)
      : action.kind && typeof action.row === "number" && typeof action.col === "number"
        ? applyWall(room.state, player.side, action.kind, action.row, action.col)
        : null;

  if (!next) {
    throw new Error("Illegal move.");
  }

  if (next.winner) {
    next.log = `${player.side} wins the match!`;
  } else {
    next.log = `${player.side} played. ${other(player.side)} to move.`;
  }

  room.state = next;
  room.updatedAt = Date.now();
  return room;
}

export function getRoom(roomId: string): Room | null {
  return rooms.get(roomId) ?? null;
}

export function removePlayer(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return;
  }
  room.state.log = `A player disconnected.`;
  room.updatedAt = Date.now();
}

export function serializeRoom(room: Room, forSide: Side) {
  return {
    roomId: room.id,
    side: forSide,
    players: room.players.map((p) => ({ name: p.name, side: p.side })),
    state: serializeState(room.state),
    updatedAt: room.updatedAt,
  };
}

export type SerializedRoom = ReturnType<typeof serializeRoom>;
