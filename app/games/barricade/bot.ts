import {
  type BarricadeState,
  type Side,
  type Position,
  BOARD_SIZE,
  applyMove,
  applyWall,
  canPlaceWall,
  shortestDistance,
  targetRow,
  wallAllowed,
  neighbors,
} from "@/lib/barricade-engine";

export function botTakeTurn(current: BarricadeState): BarricadeState {
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
