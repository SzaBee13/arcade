"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ActionMode,
  BOARD_SIZE,
  type BarricadeState,
  type Position,
  type Side,
  type WallKind,
  applyMove,
  applyWall,
  canPlaceWall,
  canMove,
  createInitialState,
  deserializeWalls,
  key,
  neighbors,
  other,
  shortestDistance,
  targetRow,
  wallAllowed,
} from "@/lib/barricade-engine";

const SIDES: Record<string, string> = {
  A: "Amber",
  B: "Blue",
};

type ServerState = {
  positions: Record<Side, Position>;
  walls: { horizontal: string[]; vertical: string[] };
  turn: Side;
  remainingWalls: Record<Side, number>;
  winner: Side | null;
  log: string;
};

type SerializedRoom = {
  roomId: string;
  side: Side;
  players: { name: string; side: Side }[];
  state: ServerState;
  updatedAt: number;
};

function stateFromServer(state: ServerState): BarricadeState {
  return {
    positions: state.positions,
    walls: deserializeWalls(state.walls),
    turn: state.turn,
    remainingWalls: state.remainingWalls,
    winner: state.winner,
    log: state.log,
  };
}

function botTakeTurn(current: BarricadeState): BarricadeState {
  const botSide: Side = "B";
  const playerSide: Side = "A";

  const botNeighbors = neighbors(current.positions[botSide], current.walls, current.positions[playerSide]);
  if (botNeighbors.length === 0) {
    return { ...current, winner: playerSide, log: "Bot is trapped. You win!" };
  }

  const playerDistance = shortestDistance(current.positions[playerSide], targetRow(playerSide), current.walls, current.positions[botSide]);
  const botDistance = shortestDistance(current.positions[botSide], targetRow(botSide), current.walls, current.positions[playerSide]);

  if (current.remainingWalls[botSide] > 0 && playerDistance <= botDistance + 1) {
    const candidates: Array<{ kind: "h" | "v"; row: number; col: number; score: number }> = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        for (const kind of ["h", "v"] as const) {
          if (!wallAllowed(kind, row, col)) continue;
          if (!canPlaceWall(current, kind, row, col)) continue;
          const next = applyWall(current, botSide, kind, row, col);
          if (!next) continue;
          const afterPlayer = shortestDistance(next.positions[playerSide], targetRow(playerSide), next.walls, next.positions[botSide]);
          const afterBot = shortestDistance(next.positions[botSide], targetRow(botSide), next.walls, next.positions[playerSide]);
          candidates.push({ kind, row, col, score: afterPlayer - afterBot });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (best && best.score > 0) {
      const next = applyWall(current, botSide, best.kind, best.row, best.col);
      if (next) {
        return { ...next, log: "Bot placed a barricade to slow you down." };
      }
    }
  }

  const sortedMoves = botNeighbors
    .map((move) => ({
      move,
      dist: shortestDistance(move, targetRow(botSide), current.walls, current.positions[playerSide]),
    }))
    .sort((a, b) => a.dist - b.dist);

  const bestMove = sortedMoves[0]?.move ?? botNeighbors[0];
  const next = applyMove(current, botSide, bestMove);
  if (!next) return current;
  if (next.winner === botSide) {
    return { ...next, log: "Bot reached your edge first." };
  }
  return { ...next, log: "Bot moved. Your turn." };
}

type FriendUser = { uuid: string; username: string; nickname: string };

async function api(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export function BarricadeBoard({ playerName }: { playerName: string }) {
  const [gameType, setGameType] = useState<"bot" | "multi">("bot");
  const [mode, setMode] = useState<ActionMode>("move");
  const [state, setState] = useState<BarricadeState>(() => createInitialState());
  const [roomInfo, setRoomInfo] = useState<SerializedRoom | null>(null);
  const [roomInput, setRoomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [inviteMsg, setInviteMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const yourSide: Side = roomInfo?.side ?? "A";
  const enemySide: Side = other(yourSide);
  const multiplayerReady = gameType === "multi" ? !!roomInfo && roomInfo.players.length === 2 : true;
  const canAct = multiplayerReady && !state.winner && state.turn === yourSide;

  const reachable = useMemo(() => {
    if (!canAct || mode !== "move") return [] as Position[];
    return neighbors(state.positions[yourSide], state.walls, state.positions[enemySide]);
  }, [canAct, mode, state, yourSide, enemySide]);

  useEffect(() => {
    api("/api/friends").then((data) => {
      if (data?.friends) setFriends(data.friends);
    });
  }, []);

  const startPolling = useCallback((roomId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const data: SerializedRoom = await api(`/api/barricade?roomId=${roomId}`);
      if (data?.state) {
        setRoomInfo(data);
        setState((prev) => {
          const next = stateFromServer(data.state);
          if (next.turn !== prev.turn || next.log !== prev.log || next.winner !== prev.winner) {
            return next;
          }
          return prev;
        });
      }
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameType !== "bot" || state.winner || state.turn !== "B") return;
    const timer = window.setTimeout(() => {
      setMode("move");
      setState((current) => botTakeTurn(current));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [gameType, state.winner, state.turn]);

  async function joinRoom(action: "create" | "join") {
    setLoading(true);
    try {
      const data: SerializedRoom & { error?: string } = await api("/api/barricade", {
        action,
        roomId: roomInput.trim() || undefined,
      });
      if (data.error) {
        setState((prev) => ({ ...prev, log: data.error! }));
        return;
      }
      setRoomInfo(data);
      setState(stateFromServer(data.state));
      if (data.roomId) startPolling(data.roomId);
    } finally {
      setLoading(false);
    }
  }

  async function sendMove(target: Position) {
    if (!canAct || mode !== "move") return;

    if (gameType === "bot") {
      if (!canMove(state.positions[yourSide], target, state.walls, state.positions[enemySide])) return;
      const next = applyMove(state, yourSide, target);
      if (next) {
        setState(next.winner ? { ...next, log: "You reached the far side. Victory!" } : { ...next, log: "Solid move. Bot is thinking..." });
      }
      return;
    }

    if (!roomInfo) return;
    const data: SerializedRoom & { error?: string } = await api("/api/barricade", {
      action: "move",
      roomId: roomInfo.roomId,
      to: target,
    });
    if (data.error) {
      setState((prev) => ({ ...prev, log: data.error! }));
      return;
    }
    setRoomInfo(data);
    setState(stateFromServer(data.state));
  }

  async function sendWall(kind: WallKind, row: number, col: number) {
    if (!canAct || mode !== "barricade") return;

    if (gameType === "bot") {
      const next = applyWall(state, yourSide, kind, row, col);
      if (!next) {
        setState((prev) => ({ ...prev, log: "Invalid barricade. Every player must keep at least one path." }));
        return;
      }
      setState({ ...next, log: "Barricade dropped. Bot is thinking..." });
      return;
    }

    if (!roomInfo) return;
    const data: SerializedRoom & { error?: string } = await api("/api/barricade", {
      action: "wall",
      roomId: roomInfo.roomId,
      kind,
      row,
      col,
    });
    if (data.error) {
      setState((prev) => ({ ...prev, log: data.error! }));
      return;
    }
    setRoomInfo(data);
    setState(stateFromServer(data.state));
  }

  function resetLocal() {
    setMode("move");
    setState(createInitialState("Fresh board. Your turn."));
    setRoomInfo(null);
    setInviteMsg("");
    if (pollRef.current) clearInterval(pollRef.current);
  }

  function wallCanPlace(kind: WallKind, row: number, col: number): boolean {
    if (!canAct || mode !== "barricade") return false;
    if (state.remainingWalls[yourSide] <= 0) return false;
    return canPlaceWall(state, kind, row, col);
  }

  function opponentName() {
    if (gameType === "bot") return "Bot";
    if (!roomInfo) return "Opponent";
    const opp = roomInfo.players.find((p) => p.side !== yourSide);
    return opp?.name ?? "Opponent";
  }

  async function createAndInviteFriend(friend: FriendUser) {
    setInviteMsg("");
    const data: SerializedRoom & { error?: string } = await api("/api/barricade", { action: "create" });
    if (data.error) {
      setInviteMsg(data.error);
      return;
    }
    setRoomInfo(data);
    setState(stateFromServer(data.state));
    startPolling(data.roomId);

    const inv = await api("/api/invite", {
      action: "send",
      toUuid: friend.uuid,
      roomId: data.roomId,
      game: "barricade",
    });
    if (inv.error) {
      setInviteMsg(inv.error);
    } else {
      setInviteMsg(`Invited ${friend.nickname || friend.username} to room ${data.roomId}`);
    }
  }

  return (
    <section className="grid grid-cols-[minmax(220px,300px)_1fr] gap-4 max-lg:grid-cols-1">
      <aside className="grid gap-3 rounded-2xl border border-line/28 bg-panel/80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Match Feed</h2>
        </div>

        <p className="m-0 text-ink-2">{state.log}</p>

        <div className="flex gap-2.5">
          <button
            type="button"
            className={`btn-arcade ${gameType === "bot" ? "active" : "border-dashed"}`}
            onClick={() => { setGameType("bot"); resetLocal(); }}
          >
            Vs Bot
          </button>
          <button
            type="button"
            className={`btn-arcade ${gameType === "multi" ? "active" : "border-dashed"}`}
            onClick={() => { setGameType("multi"); setState(createInitialState("Create or join a room.")); }}
          >
            Multiplayer
          </button>
        </div>

        {gameType === "multi" ? (
          <div className="grid gap-2 rounded-xl border border-line/28 bg-[rgba(11,18,33,0.7)] p-3">
            {roomInfo ? (
              <>
                <p className="m-0 text-sm text-ink-2">Room: {roomInfo.roomId}</p>
                <p className="m-0 text-sm text-ink-2">You are {SIDES[yourSide]}</p>
                <p className="m-0 text-sm text-ink-2">Players: {roomInfo.players.length}/2</p>
                {roomInfo.players.length < 2 ? (
                  <p className="m-0 text-xs text-ink-3">
                    Waiting for opponent. Share room ID: <strong>{roomInfo.roomId}</strong>
                  </p>
                ) : null}
                <button type="button" className="btn-arcade danger" onClick={resetLocal}>
                  Leave room
                </button>
              </>
            ) : (
              <>
                <input
                  value={roomInput}
                  onChange={(event) => setRoomInput(event.target.value)}
                  className="input-arcade"
                  placeholder="room name (optional)"
                />
                <div className="flex gap-2.5">
                  <button type="button" className="btn-arcade" onClick={() => joinRoom("create")} disabled={loading}>
                    Create room
                  </button>
                  <button type="button" className="btn-arcade" onClick={() => joinRoom("join")} disabled={loading}>
                    Join room
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <dl className="m-0 grid gap-2">
          <div className="flex justify-between gap-2">
            <dt className="font-bold">{gameType === "bot" ? playerName : SIDES[yourSide]}</dt>
            <dd className="m-0 text-ink-2">{state.remainingWalls[yourSide]} barricades</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="font-bold">{opponentName()}</dt>
            <dd className="m-0 text-ink-2">{state.remainingWalls[enemySide]} barricades</dd>
          </div>
        </dl>

        <div className="flex gap-2.5">
          <button
            type="button"
            className={`btn-arcade ${mode === "move" ? "active" : "border-dashed"}`}
            onClick={() => setMode("move")}
            disabled={!canAct}
          >
            Move
          </button>
          <button
            type="button"
            className={`btn-arcade ${mode === "barricade" ? "active" : "border-dashed"}`}
            onClick={() => setMode("barricade")}
            disabled={!canAct || state.remainingWalls[yourSide] <= 0}
          >
            Barricade
          </button>
        </div>

        <div className="grid gap-1.5 rounded-xl border border-line/28 bg-[rgba(11,18,33,0.7)] p-2.5">
          <h3 className="m-0 text-sm">Play with Friend</h3>
          {friends.length === 0 ? (
            <p className="m-0 text-xs text-ink-3">No friends yet. Add friends from the lobby.</p>
          ) : (
            <ul className="m-0 grid list-none gap-1 p-0">
              {friends.map((f) => (
                <li key={f.uuid} className="flex items-center justify-between gap-1 text-sm">
                  <span>{f.nickname || f.username}</span>
                  <button
                    type="button"
                    className="btn-arcade tiny"
                    onClick={() => createAndInviteFriend(f)}
                    disabled={loading || (gameType === "multi" && !!roomInfo)}
                  >
                    Invite
                  </button>
                </li>
              ))}
            </ul>
          )}
          {inviteMsg ? <p className="m-0 text-sm text-ink-2">{inviteMsg}</p> : null}
        </div>

        <button type="button" className="btn-arcade danger" onClick={resetLocal}>
          Restart
        </button>
      </aside>

      <div className="overflow-auto rounded-2xl border border-line/28 bg-gradient-to-br from-[rgba(17,26,45,0.94)] to-[rgba(8,14,27,0.94)] p-3" role="grid" aria-label="Barricade board">
        {Array.from({ length: BOARD_SIZE }).map((_, row) => (
          <div className="flex" key={`row-${row}`}>
            {Array.from({ length: BOARD_SIZE }).map((__, col) => {
              const isYou = state.positions[yourSide].row === row && state.positions[yourSide].col === col;
              const isEnemy = state.positions[enemySide].row === row && state.positions[enemySide].col === col;
              const canReach = reachable.some((tile) => tile.row === row && tile.col === col);

              const hasH = state.walls.horizontal.has(key(row, col));
              const hasV = state.walls.vertical.has(key(row, col));

              return (
                <div key={`tile-${row}-${col}`} className="relative m-1.5 h-14 w-14 max-sm:m-1 max-sm:h-[47px] max-sm:w-[47px]">
                  <button
                    type="button"
                    className={`h-10 w-10 cursor-pointer rounded-xl border border-white/35 bg-white/5 font-extrabold text-ink-1 transition-transform hover:scale-105 disabled:cursor-not-allowed max-sm:h-[38px] max-sm:w-[38px] ${canReach ? "border-bg-glow-2/90 bg-bg-glow-2/20" : ""} ${isYou ? "bg-bg-glow-2/30" : ""} ${isEnemy ? "bg-bg-glow/30" : ""}`}
                    onClick={() => sendMove({ row, col })}
                    disabled={!canAct || mode !== "move" || !!state.winner}
                  >
                    {isYou ? "Y" : isEnemy ? "E" : ""}
                  </button>

                  {col < BOARD_SIZE - 1 ? (
                    <button
                      type="button"
                      className={`absolute right-[-8px] top-[-2px] w-[9px] cursor-pointer rounded-sm border border-line/25 bg-white/5 disabled:cursor-not-allowed max-sm:top-[3px] max-sm:h-[31px] ${hasV ? "border-amber-300/95 bg-amber-300/80" : "h-[58px]"} ${wallCanPlace("v", row, col) ? "border-bg-glow-2/60 bg-bg-glow-2/10" : ""}`}
                      onClick={() => sendWall("v", row, col)}
                      disabled={!wallCanPlace("v", row, col)}
                      aria-label={`Place vertical barricade at ${row},${col}`}
                    />
                  ) : null}

                  {row < BOARD_SIZE - 1 ? (
                    <button
                      type="button"
                      className={`absolute bottom-[-8px] left-[-2px] h-[9px] cursor-pointer rounded-sm border border-line/25 bg-white/5 disabled:cursor-not-allowed max-sm:left-[3px] max-sm:w-[31px] ${hasH ? "border-amber-300/95 bg-amber-300/80" : "w-[58px]"} ${wallCanPlace("h", row, col) ? "border-bg-glow-2/60 bg-bg-glow-2/10" : ""}`}
                      onClick={() => sendWall("h", row, col)}
                      disabled={!wallCanPlace("h", row, col)}
                      aria-label={`Place horizontal barricade at ${row},${col}`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
