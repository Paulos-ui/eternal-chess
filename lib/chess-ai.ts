import { Chess, type Move } from "chess.js";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export type Difficulty = "easy" | "medium" | "hard";

function evaluate(fen: string): number {
  const g = new Chess(fen);
  if (g.isCheckmate()) return g.turn() === "w" ? -10000 : 10000;
  if (g.isDraw()) return 0;
  let score = 0;
  const board = g.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const v = VALUE[sq.type] * 10;
      score += sq.color === "w" ? v : -v;
    }
  }
  return score;
}

function minimax(fen: string, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const g = new Chess(fen);
  if (depth === 0 || g.isGameOver()) return evaluate(fen);
  const moves = g.moves({ verbose: true }) as Move[];
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const probe = new Chess(fen);
      probe.move({ from: m.from, to: m.to, promotion: m.promotion });
      const score = minimax(probe.fen(), depth - 1, alpha, beta, false);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const probe = new Chess(fen);
      probe.move({ from: m.from, to: m.to, promotion: m.promotion });
      const score = minimax(probe.fen(), depth - 1, alpha, beta, true);
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function pickAiMove(fen: string, difficulty: Difficulty = "easy"): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  // Easy: random move (original behavior)
  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === "hard" ? 3 : 2;
  const isBlack = game.turn() === "b"; // AI always plays black

  let bestMove: Move | null = null;
  let bestScore = isBlack ? Infinity : -Infinity;

  for (const m of moves) {
    const probe = new Chess(fen);
    probe.move({ from: m.from, to: m.to, promotion: m.promotion });
    const score = minimax(probe.fen(), depth - 1, -Infinity, Infinity, !isBlack);
    if (isBlack ? score < bestScore : score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}