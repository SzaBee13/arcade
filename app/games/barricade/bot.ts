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
export type BotDifficulty = "easy" | "normal" | "hard";

const MAX_WALL_ACTIONS = 18;
const MAX_OPPONENT_WALL_REPLIES = 8;
const MAX_WALL_CANDIDATES = 32;
const EASY_WALL_ACTIONS = 4;

function legalMoves(state: BarricadeState, side: Side): Position[] {
  return neighbors(state.positions[side], state.walls, state.positions[side === "A" ? "B" : "A"]);
}

function wallPressureScore(state: BarricadeState, side: Side, row: number, col: number): number {
  const opponentSide = side === "A" ? "B" : "A";
  const opponent = state.positions[opponentSide];
  const self = state.positions[side];

  return (
    Math.abs(row - opponent.row) +
    Math.abs(col - opponent.col) * 0.75 +
    Math.abs(row - self.row) * 0.25 +
    Math.abs(col - self.col) * 0.25
  );
}

function wallAnchors(state: BarricadeState, side: Side): Array<{ wallKind: "h" | "v"; row: number; col: number }> {
  const anchors: Array<{ wallKind: "h" | "v"; row: number; col: number }> = [];

  for (let row = 0; row < BOARD_SIZE - 1; row += 1) {
    for (let col = -1; col <= BOARD_SIZE - 1; col += 1) {
      anchors.push({ wallKind: "h", row, col });
    }
  }

  for (let row = -1; row <= BOARD_SIZE - 1; row += 1) {
    for (let col = 0; col < BOARD_SIZE - 1; col += 1) {
      anchors.push({ wallKind: "v", row, col });
    }
  }

  return anchors.sort((left, right) => {
    const leftScore = wallPressureScore(state, side, left.row, left.col);
    const rightScore = wallPressureScore(state, side, right.row, right.col);
    return leftScore - rightScore;
  });
}

function legalWalls(state: BarricadeState, side: Side): Array<{ wallKind: "h" | "v"; row: number; col: number }> {
  if (state.remainingWalls[side] <= 0) {
    return [];
  }

  const actions: Array<{ wallKind: "h" | "v"; row: number; col: number }> = [];
  const anchors = wallAnchors(state, side);

  for (let index = 0; index < anchors.length; index += 1) {
    const { wallKind, row, col } = anchors[index];
    if (index >= MAX_WALL_CANDIDATES && actions.length > 0) {
      break;
    }
    if (!wallAllowed(wallKind, row, col)) continue;
    if (!canPlaceWall(state, wallKind, row, col)) continue;
    actions.push({ wallKind, row, col });
    if (actions.length >= MAX_WALL_ACTIONS) {
      break;
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

  for (const { wallKind, row, col } of legalWalls(afterBot, opponentSide).slice(0, MAX_OPPONENT_WALL_REPLIES)) {
    const walled = applyWall(afterBot, opponentSide, wallKind, row, col);
    if (!walled) continue;
    bestReply = Math.min(bestReply, evaluateState(walled));
  }

  if (bestReply !== Number.POSITIVE_INFINITY) {
    return bestReply;
  }

  return evaluateState(afterBot);
}

function scoreAction(next: BarricadeState, difficulty: Exclude<BotDifficulty, "easy">): number {
  if (next.winner === "B") return 100_000;
  if (next.winner === "A") return -100_000;
  if (difficulty === "normal") return evaluateState(next);
  return bestOpponentReplyScore(next);
}

function collectActions(state: BarricadeState, side: Side, difficulty: BotDifficulty): ScoredAction[] {
  const actions: ScoredAction[] = [];
  const wallLimit = difficulty === "easy" ? EASY_WALL_ACTIONS : MAX_WALL_ACTIONS;

  for (const to of legalMoves(state, side)) {
    const next = applyMove(state, side, to);
    if (!next) continue;
    actions.push({
      kind: "move",
      to,
      next,
      score: difficulty === "easy" ? 0 : scoreAction(next, difficulty),
    });
  }

  for (const { wallKind, row, col } of legalWalls(state, side).slice(0, wallLimit)) {
    const next = applyWall(state, side, wallKind, row, col);
    if (!next) continue;
    actions.push({
      kind: "wall",
      wallKind,
      row,
      col,
      next,
      score: difficulty === "easy" ? 0 : scoreAction(next, difficulty),
    });
  }

  return actions;
}

function actionLog(action: ScoredAction, next: BarricadeState, botSide: Side): string {
  if (next.winner === botSide) {
    return "Bot reached your edge first.";
  }
  if (action.kind === "move") {
    return "Bot advanced. Your turn.";
  }
  return "Bot placed a barricade to slow you down.";
}

export function botTakeTurn(current: BarricadeState, difficulty: BotDifficulty = "hard"): BarricadeState {
  const botSide: Side = "B";
  const playerSide: Side = "A";

  const botActions = collectActions(current, botSide, difficulty);
  if (botActions.length === 0) {
    return { ...current, winner: playerSide, log: "Bot is trapped. You win!" };
  }

  const best =
    difficulty === "easy"
      ? botActions[Math.floor(Math.random() * botActions.length)]
      : botActions.sort((left, right) => right.score - left.score)[0];
  if (!best) {
    return current;
  }

  return { ...best.next, log: actionLog(best, best.next, botSide) };
}
