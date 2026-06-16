"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { botTakeTurn } from "./bot";
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
  const [wallKind, setWallKind] = useState<WallKind>("v");
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
        setState((prev) => ({ ...prev, log: "Invalid barricade. Both players need a path and at least one legal move." }));
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
    setWallKind("v");
    setState(createInitialState("Fresh board. Your turn."));
    setRoomInfo(null);
    setInviteMsg("");
    if (pollRef.current) clearInterval(pollRef.current);
  }

  function wallCanPlace(kind: WallKind, row: number, col: number): boolean {
    if (!canAct || mode !== "barricade") return false;
    if (kind !== wallKind) return false;
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

        {mode === "barricade" ? (
          <div className="grid gap-2 rounded-xl border border-line/28 bg-[rgba(11,18,33,0.7)] p-2.5">
            <p className="m-0 text-xs leading-relaxed text-ink-2">
              Choose a direction, then click the glowing edge. Vertical goes on the right edge and spans two rows.
              Horizontal goes on the bottom edge and spans two columns.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`btn-arcade tiny ${wallKind === "v" ? "active" : "border-dashed"}`}
                onClick={() => setWallKind("v")}
              >
                Vertical ↕
              </button>
              <button
                type="button"
                className={`btn-arcade tiny ${wallKind === "h" ? "active" : "border-dashed"}`}
                onClick={() => setWallKind("h")}
              >
                Horizontal ↔
              </button>
            </div>
          </div>
        ) : null}

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
        {mode === "barricade" ? (
          <div className="mb-3 rounded-xl border border-bg-glow-2/30 bg-bg-glow-2/10 px-3 py-2 text-sm text-ink-2">
            Placing: <strong>{wallKind === "v" ? "vertical" : "horizontal"}</strong> barricade. Only legal anchors glow; a barricade always occupies two connected edge slots.
          </div>
        ) : null}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
          <span>You start at the top and race to the bottom.</span>
          <span>Enemy starts at the bottom and races to the top.</span>
        </div>
        <div
          className="mx-auto grid w-max rounded-2xl border border-line/20 bg-[rgba(7,12,22,0.42)] p-2 shadow-inner"
          style={{
            gridTemplateColumns: "minmax(34px, 48px) repeat(8, 12px minmax(34px, 48px))",
            gridTemplateRows: "12px repeat(8, minmax(34px, 48px) 12px) minmax(34px, 48px)",
          }}
        >
          {Array.from({ length: BOARD_SIZE * 2 }).map((_, gridRow) =>
            Array.from({ length: BOARD_SIZE * 2 - 1 }).map((__, gridCol) => {
              const isCell = gridRow % 2 === 1 && gridCol % 2 === 0;
              const isVerticalSlot = gridRow % 2 === 1 && gridCol % 2 === 1;
              const isHorizontalSlot = gridRow % 2 === 0 && gridCol % 2 === 0;
              const isIntersection = gridRow % 2 === 0 && gridCol % 2 === 1;

              if (isCell) {
                const row = (gridRow - 1) / 2;
                const col = gridCol / 2;
                const isYou = state.positions[yourSide].row === row && state.positions[yourSide].col === col;
                const isEnemy = state.positions[enemySide].row === row && state.positions[enemySide].col === col;
                const canReach = reachable.some((tile) => tile.row === row && tile.col === col);

                return (
                  <button
                    key={`cell-${row}-${col}`}
                    type="button"
                    className={`m-0.5 flex items-center justify-center rounded-xl border border-white/35 bg-white/5 text-sm font-extrabold text-ink-1 transition-transform hover:scale-105 disabled:cursor-not-allowed ${canReach ? "border-bg-glow-2/90 bg-bg-glow-2/20 shadow-[0_0_14px_rgba(93,214,192,0.22)]" : ""} ${isYou ? "bg-bg-glow-2/30" : ""} ${isEnemy ? "bg-bg-glow/30" : ""}`}
                    onClick={() => sendMove({ row, col })}
                    disabled={!canAct || mode !== "move" || !!state.winner}
                    aria-label={`Board square ${row},${col}`}
                  >
                    {isYou ? "Y" : isEnemy ? "E" : ""}
                  </button>
                );
              }

              if (isVerticalSlot) {
                const row = (gridRow - 1) / 2;
                const col = (gridCol - 1) / 2;
                const hasWall = state.walls.vertical.has(key(row, col));
                const canPlace = wallCanPlace("v", row, col);

                if (hasWall) {
                  return <div key={`v-wall-${row}-${col}`} className="m-[1px] rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]" />;
                }
                if (canPlace) {
                  return (
                    <button
                      key={`v-place-${row}-${col}`}
                      type="button"
                      className="m-[1px] rounded-full border border-bg-glow-2/90 bg-bg-glow-2/35 text-[9px] font-black text-ink-1 shadow-[0_0_12px_rgba(93,214,192,0.35)] hover:bg-bg-glow-2/55"
                      onClick={() => sendWall("v", row, col)}
                      title={`Blocks passage between (${row},${col}) and (${row + 1},${col})`}
                      aria-label={`Place vertical barricade between (${row},${col}) and (${row + 1},${col})`}
                    >
                      V
                    </button>
                  );
                }
                return <div key={`v-empty-${row}-${col}`} />;
              }

              if (isHorizontalSlot) {
                const row = (gridRow - 2) / 2;
                const col = gridCol / 2;

                if (gridRow === 0 && mode === "barricade" && wallKind === "v") {
                  const hasWall = state.walls.vertical.has(key(-1, col));
                  const canPlace = wallCanPlace("v", -1, col);
                  if (hasWall) {
                    return <div key={`v-wall-${-1}-${col}`} className="m-[1px] rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]" />;
                  }
                  if (canPlace) {
                    return (
                      <button
                        key={`v-place-${-1}-${col}`}
                        type="button"
                        className="m-[1px] rounded-full border border-bg-glow-2/90 bg-bg-glow-2/35 text-[9px] font-black text-ink-1 shadow-[0_0_12px_rgba(93,214,192,0.35)] hover:bg-bg-glow-2/55"
                        onClick={() => sendWall("v", -1, col)}
                        title={`Blocks passage above (0,${col}) — half off the top of the board`}
                        aria-label={`Place vertical barricade half off the top edge at column ${col}`}
                      >
                        V
                      </button>
                    );
                  }
                  return <div key={`v-empty-${-1}-${col}`} />;
                }

                const hasWall = state.walls.horizontal.has(key(row, col));
                const canPlace = wallCanPlace("h", row, col);

                if (hasWall) {
                  return <div key={`h-wall-${row}-${col}`} className="m-[1px] rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]" />;
                }
                if (canPlace) {
                  return (
                    <button
                      key={`h-place-${row}-${col}`}
                      type="button"
                      className="m-[1px] rounded-full border border-bg-glow-2/90 bg-bg-glow-2/35 text-[9px] font-black leading-none text-ink-1 shadow-[0_0_12px_rgba(93,214,192,0.35)] hover:bg-bg-glow-2/55"
                      onClick={() => sendWall("h", row, col)}
                      title={`Blocks passage between (${row},${col}) and (${row},${col + 1})`}
                      aria-label={`Place horizontal barricade between (${row},${col}) and (${row},${col + 1})`}
                    >
                      &gt;  
                    </button>
                  );
                }
                return <div key={`h-empty-${row}-${col}`} />;
              }

              if (isIntersection) {
                return <div key={`cross-${gridRow}-${gridCol}`} className="m-[3px] rounded-full bg-line/15" />;
              }

              return null;
            }),
          )}
        </div>
      </div>
    </section>
  );
}
