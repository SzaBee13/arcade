import {
  type BarricadeState,
  type Position,
  type Side,
  BOARD_SIZE,
  applyMove,
  applyWall,
  canPlaceWall,
  neighbors,
  shortestDistance,
  targetRow,
  wallAllowed,
} from "@/lib/barricade/engine";

type Action =
  | { kind: "move"; to: Position }
  | { kind: "wall"; wallKind: "h" | "v"; row: number; col: number };

type ScoredAction = Action & { score: number; next: BarricadeState };

function legalMoves(state: BarricadeState, side: Side): Position[] {
  return neighbors(state.positions[side], state.walls, state.positions[side === "A" ? "B" : "A"]);
}

function legalWalls(state: BarricadeState, side: Side): Array<{ wallKind: "h" | "v"; row: number; col: number }> {
  if (state.remainingWalls[side] <= 0) {
    return [];
  }

  const actions: Array<{ wallKind: "h" | "v"; row: number; col: number }> = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      for (const wallKind of ["h", "v"] as const) {
        if (!wallAllowed(wallKind, row, col)) continue;
        if (!canPlaceWall(state, wallKind, row, col)) continue;
        actions.push({ wallKind, row, col });
      }
    }
  }
  return actions;
}

function evaluateState(state: BarricadeState): number {
  if (state.winner === "B") return 100_000;
  if (state.winner === "A") return -100_000;

  const botDistance = shortestDistance(state.positions.B, targetRow("B"), state.walls, state.positions.A);
  const playerDistance = shortestDistance(state.positions.A, targetRow("A"), state.walls, state.positions.B);

  if (!Number.isFinite(botDistance)) return -50_000;
  if (!Number.isFinite(playerDistance)) return 50_000;

  const botMobility = legalMoves(state, "B").length;
  const playerMobility = legalMoves(state, "A").length;
  const wallBalance = state.remainingWalls.B - state.remainingWalls.A;

  return (
    (playerDistance - botDistance) * 18 +
    (botMobility - playerMobility) * 3 +
    wallBalance * 1.5 +
    (state.positions.A.row - (BOARD_SIZE - 1 - state.positions.B.row)) * 0.5
  );
}

function bestOpponentReplyScore(afterBot: BarricadeState): number {
  const opponentSide: Side = "A";
  let bestReply = Number.POSITIVE_INFINITY;

  for (const to of legalMoves(afterBot, opponentSide)) {
    const moved = applyMove(afterBot, opponentSide, to);
    if (!moved) continue;
    bestReply = Math.min(bestReply, evaluateState(moved));
  }

  for (const { wallKind, row, col } of legalWalls(afterBot, opponentSide)) {
    const walled = applyWall(afterBot, opponentSide, wallKind, row, col);
    if (!walled) continue;
    bestReply = Math.min(bestReply, evaluateState(walled));
  }

  if (bestReply !== Number.POSITIVE_INFINITY) {
    return bestReply;
  }

  return evaluateState(afterBot);
}

function scoreAction(next: BarricadeState): number {
  if (next.winner === "B") return 100_000;
  if (next.winner === "A") return -100_000;
  return bestOpponentReplyScore(next);
}

function collectActions(state: BarricadeState, side: Side): ScoredAction[] {
  const actions: ScoredAction[] = [];

  for (const to of legalMoves(state, side)) {
    const next = applyMove(state, side, to);
    if (!next) continue;
    actions.push({ kind: "move", to, next, score: scoreAction(next) });
  }

  for (const { wallKind, row, col } of legalWalls(state, side)) {
    const next = applyWall(state, side, wallKind, row, col);
    if (!next) continue;
    actions.push({ kind: "wall", wallKind, row, col, next, score: scoreAction(next) });
  }

  return actions;
}

export function botTakeTurn(current: BarricadeState): BarricadeState {
  const botSide: Side = "B";
  const playerSide: Side = "A";

  const botActions = collectActions(current, botSide);
  if (botActions.length === 0) {
    return { ...current, winner: playerSide, log: "Bot is trapped. You win!" };
  }

  botActions.sort((left, right) => right.score - left.score);
  const best = botActions[0];
  if (!best) {
    return current;
  }

  if (best.kind === "move") {
    const next = applyMove(current, botSide, best.to);
    if (!next) return current;
    if (next.winner === botSide) {
      return { ...next, log: "Bot reached your edge first." };
    }
    return { ...next, log: "Bot advanced aggressively. Your turn." };
  }

  const next = applyWall(current, botSide, best.wallKind, best.row, best.col);
  if (!next) return current;
  return { ...next, log: "Bot placed a barricade to slow you down." };
}
