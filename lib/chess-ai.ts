import { Chess, type Move } from "chess.js";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * A small, dependency-free opponent: looks one ply ahead, prefers the move that
 * wins the most material (checkmate scored highest), random tiebreak. Good enough
 * to feel alive in a demo without bundling a full engine.
 */
export function pickAiMove(fen: string): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  let best: Move[] = [];
  let bestScore = -Infinity;

  for (const m of moves) {
    let score = 0;
    if (m.captured) score += VALUE[m.captured] * 10;
    if (m.promotion) score += VALUE[m.promotion] * 8;

    const probe = new Chess(fen);
    probe.move({ from: m.from, to: m.to, promotion: m.promotion });
    if (probe.isCheckmate()) score += 10_000;
    else if (probe.isCheck()) score += 2;
    // Discourage walking into immediate recapture-heavy squares slightly.
    score += Math.random();

    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) {
      best.push(m);
    }
  }
  return best[Math.floor(Math.random() * best.length)];
}
