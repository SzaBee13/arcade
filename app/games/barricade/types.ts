import { type BarricadeState, type Position, type Side, deserializeWalls } from "@/lib/barricade-engine";

export const SIDES: Record<string, string> = {
  A: "Amber",
  B: "Blue",
};

export type ServerState = {
  positions: Record<Side, Position>;
  walls: { horizontal: string[]; vertical: string[] };
  turn: Side;
  remainingWalls: Record<Side, number>;
  winner: Side | null;
  log: string;
};

export type SerializedRoom = {
  roomId: string;
  side: Side;
  players: { name: string; side: Side }[];
  state: ServerState;
  updatedAt: number;
};

export type FriendUser = { uuid: string; username: string; nickname: string };

export function stateFromServer(state: ServerState): BarricadeState {
  return {
    positions: state.positions,
    walls: deserializeWalls(state.walls),
    turn: state.turn,
    remainingWalls: state.remainingWalls,
    winner: state.winner,
    log: state.log,
  };
}
