export type Position = { row: number; col: number };
export type Side = "A" | "B";
export type ActionMode = "move" | "barricade";
export type WallKind = "h" | "v";

export const BOARD_SIZE = 9;
export const MAX_BARRICADES = 15;

export type WallState = {
  horizontal: Set<string>;
  vertical: Set<string>;
};

export type BarricadeState = {
  positions: Record<Side, Position>;
  walls: WallState;
  turn: Side;
  remainingWalls: Record<Side, number>;
  winner: Side | null;
  log: string;
};

export type SerializedBarricadeState = {
  positions: Record<Side, Position>;
  walls: { horizontal: string[]; vertical: string[] };
  turn: Side;
  remainingWalls: Record<Side, number>;
  winner: Side | null;
  log: string;
};

export function key(row: number, col: number): string {
  return `${row},${col}`;
}

export function other(side: Side): Side {
  return side === "A" ? "B" : "A";
}

export function cloneWalls(walls: WallState): WallState {
  return {
    horizontal: new Set(walls.horizontal),
    vertical: new Set(walls.vertical),
  };
}

export function serializeState(state: BarricadeState): SerializedBarricadeState {
  return {
    positions: state.positions,
    walls: {
      horizontal: [...state.walls.horizontal],
      vertical: [...state.walls.vertical],
    },
    turn: state.turn,
    remainingWalls: state.remainingWalls,
    winner: state.winner,
    log: state.log,
  };
}

export function deserializeWalls(input: { horizontal: string[]; vertical: string[] }): WallState {
  return {
    horizontal: new Set(input.horizontal),
    vertical: new Set(input.vertical),
  };
}

function between(a: Position, b: Position): { direction: WallKind; row: number; col: number } | null {
  if (a.row === b.row && Math.abs(a.col - b.col) === 1) {
    return { direction: "v", row: a.row, col: Math.min(a.col, b.col) };
  }
  if (a.col === b.col && Math.abs(a.row - b.row) === 1) {
    return { direction: "h", row: Math.min(a.row, b.row), col: a.col };
  }
  return null;
}

export function wallAllowed(kind: WallKind, row: number, col: number): boolean {
  if (kind === "h") {
    return row >= 0 && row < BOARD_SIZE - 1 && col >= 0 && col < BOARD_SIZE - 1;
  }
  return row >= 0 && row < BOARD_SIZE - 1 && col >= 0 && col < BOARD_SIZE - 1;
}

export function canMove(from: Position, to: Position, walls: WallState, enemy: Position): boolean {
  if (to.row < 0 || to.col < 0 || to.row >= BOARD_SIZE || to.col >= BOARD_SIZE) {
    return false;
  }
  if (to.row === enemy.row && to.col === enemy.col) {
    return false;
  }
  const edge = between(from, to);
  if (!edge) {
    return false;
  }
  if (edge.direction === "h") {
    return !walls.horizontal.has(key(edge.row, edge.col));
  }
  return !walls.vertical.has(key(edge.row, edge.col));
}

export function neighbors(pos: Position, walls: WallState, enemy: Position): Position[] {
  const candidates = [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ];
  return candidates.filter((candidate) => canMove(pos, candidate, walls, enemy));
}

export function hasPath(start: Position, targetRow: number, walls: WallState, enemy: Position): boolean {
  const queue: Position[] = [start];
  const seen = new Set<string>([key(start.row, start.col)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    if (current.row === targetRow) {
      return true;
    }

    for (const next of neighbors(current, walls, enemy)) {
      const k = key(next.row, next.col);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }
  }

  return false;
}

export function shortestDistance(start: Position, targetRow: number, walls: WallState, enemy: Position): number {
  const queue: Array<{ pos: Position; dist: number }> = [{ pos: start, dist: 0 }];
  const seen = new Set<string>([key(start.row, start.col)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    if (current.pos.row === targetRow) {
      return current.dist;
    }

    for (const next of neighbors(current.pos, walls, enemy)) {
      const k = key(next.row, next.col);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({ pos: next, dist: current.dist + 1 });
      }
    }
  }

  return Number.POSITIVE_INFINITY;
}

export function targetRow(side: Side): number {
  return side === "A" ? BOARD_SIZE - 1 : 0;
}

function hasEdge(walls: WallState, kind: WallKind, row: number, col: number): boolean {
  return kind === "h" ? walls.horizontal.has(key(row, col)) : walls.vertical.has(key(row, col));
}

function hasCrossingWall(walls: WallState, kind: WallKind, row: number, col: number): boolean {
  if (kind === "h") {
    return walls.vertical.has(key(row, col)) && walls.vertical.has(key(row + 1, col));
  }
  return walls.horizontal.has(key(row, col)) && walls.horizontal.has(key(row, col + 1));
}

export function canPlaceWall(state: BarricadeState, kind: WallKind, row: number, col: number): boolean {
  if (!wallAllowed(kind, row, col)) {
    return false;
  }

  if (hasEdge(state.walls, kind, row, col)) {
    return false;
  }
  if (hasEdge(state.walls, kind, kind === "h" ? row : row + 1, kind === "h" ? col + 1 : col)) {
    return false;
  }
  if (hasCrossingWall(state.walls, kind, row, col)) {
    return false;
  }

  const test = cloneWalls(state.walls);
  if (kind === "h") {
    test.horizontal.add(key(row, col));
    test.horizontal.add(key(row, col + 1));
  } else {
    test.vertical.add(key(row, col));
    test.vertical.add(key(row + 1, col));
  }

  const pathA = hasPath(state.positions.A, targetRow("A"), test, state.positions.B);
  const pathB = hasPath(state.positions.B, targetRow("B"), test, state.positions.A);
  const movesA = neighbors(state.positions.A, test, state.positions.B).length > 0;
  const movesB = neighbors(state.positions.B, test, state.positions.A).length > 0;
  return pathA && pathB && movesA && movesB;
}

export function createInitialState(log = "Your turn. Move or place a barricade."): BarricadeState {
  return {
    positions: {
      A: { row: 0, col: 4 },
      B: { row: BOARD_SIZE - 1, col: 4 },
    },
    walls: { horizontal: new Set(), vertical: new Set() },
    turn: "A",
    remainingWalls: { A: MAX_BARRICADES, B: MAX_BARRICADES },
    winner: null,
    log,
  };
}

export function applyMove(state: BarricadeState, side: Side, to: Position): BarricadeState | null {
  if (state.winner || state.turn !== side) {
    return null;
  }

  const from = state.positions[side];
  const enemy = state.positions[other(side)];
  if (!canMove(from, to, state.walls, enemy)) {
    return null;
  }

  const next: BarricadeState = {
    ...state,
    positions: { ...state.positions, [side]: to },
    turn: other(side),
    log: `${side} moved.`,
  };

  if (to.row === targetRow(side)) {
    next.winner = side;
    next.log = `${side} reached the far side.`;
  }

  return next;
}

export function applyWall(state: BarricadeState, side: Side, kind: WallKind, row: number, col: number): BarricadeState | null {
  if (state.winner || state.turn !== side || state.remainingWalls[side] <= 0) {
    return null;
  }
  if (!canPlaceWall(state, kind, row, col)) {
    return null;
  }

  const walls = cloneWalls(state.walls);
  if (kind === "h") {
    walls.horizontal.add(key(row, col));
    walls.horizontal.add(key(row, col + 1));
  } else {
    walls.vertical.add(key(row, col));
    walls.vertical.add(key(row + 1, col));
  }

  return {
    ...state,
    walls,
    turn: other(side),
    remainingWalls: {
      ...state.remainingWalls,
      [side]: state.remainingWalls[side] - 1,
    },
    log: `${side} placed a barricade.`,
  };
}
