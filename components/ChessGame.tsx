"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { motion } from "framer-motion";
import { Bot, Users, RotateCcw, Sparkles } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { pickAiMove } from "@/lib/chess-ai";
import { EternalizeModal } from "./EternalizeModal";

type Mode = "ai" | "hotseat";

export interface FinishedGame {
  pgn: string;
  movesJson: string;
  fen: string;
  result: string; // 1-0 | 0-1 | 1/2-1/2
  resultLabel: string;
  winner: string; // address or "draw"
  moveCount: number;
  white: string;
  black: string;
}

export function ChessGame() {
  const account = useCurrentAccount();
  const gameRef = useRef(new Chess());
  const boardRef = useRef<HTMLDivElement>(null);

  const [fen, setFen] = useState(gameRef.current.fen());
  const [mode, setMode] = useState<Mode>("ai");
  const [status, setStatus] = useState("Your move — white to play");
  const [finished, setFinished] = useState<FinishedGame | null>(null);
  const [boardWidth, setBoardWidth] = useState(440);

  // Responsive board sizing.
  useEffect(() => {
    const el = boardRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(el.clientWidth - 28, 560);
      setBoardWidth(Math.max(280, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const whiteName = account?.address ?? "Guest (White)";
  const blackName = mode === "ai" ? "Frost Engine (AI)" : "Guest (Black)";

  const computeStatus = useCallback(() => {
    const g = gameRef.current;
    if (g.isGameOver()) return;
    const turn = g.turn() === "w" ? "White" : "Black";
    setStatus(g.inCheck() ? `${turn} is in check!` : `${turn} to move`);
  }, []);

  const finishIfOver = useCallback(() => {
    const g = gameRef.current;
    if (!g.isGameOver()) return false;

    let result = "1/2-1/2";
    let resultLabel = "Draw";
    let winner = "draw";

    if (g.isCheckmate()) {
      // side to move was checkmated -> the other side won
      const whiteWon = g.turn() === "b";
      result = whiteWon ? "1-0" : "0-1";
      resultLabel = whiteWon ? "White wins by checkmate" : "Black wins by checkmate";
      winner = whiteWon ? whiteName : blackName;
    } else if (g.isStalemate()) resultLabel = "Draw — stalemate";
    else if (g.isThreefoldRepetition()) resultLabel = "Draw — threefold repetition";
    else if (g.isInsufficientMaterial()) resultLabel = "Draw — insufficient material";

    const verbose = g.history({ verbose: true });
    setFinished({
      pgn: g.pgn(),
      movesJson: JSON.stringify(
        {
          white: whiteName,
          black: blackName,
          result,
          playedAt: new Date().toISOString(),
          moves: verbose.map((m, i) => ({
            ply: i + 1,
            san: m.san,
            from: m.from,
            to: m.to,
            piece: m.piece,
            captured: m.captured ?? null,
            fenAfter: m.after,
          })),
        },
        null,
        2,
      ),
      fen: g.fen(),
      result,
      resultLabel,
      winner,
      moveCount: Math.ceil(verbose.length / 2),
      white: whiteName,
      black: blackName,
    });
    return true;
  }, [whiteName, blackName]);

  const tryMove = useCallback(
    (from: string, to: string) => {
      const g = gameRef.current;
      try {
        const mv = g.move({ from, to, promotion: "q" });
        if (!mv) return false;
      } catch {
        return false;
      }
      setFen(g.fen());
      if (!finishIfOver()) computeStatus();
      return true;
    },
    [computeStatus, finishIfOver],
  );

  const onPieceDrop = useCallback(
    (source: string, target: string) => {
      const g = gameRef.current;
      // In AI mode, only let the human move white.
      if (mode === "ai" && g.turn() !== "w") return false;
      const ok = tryMove(source, target);
      if (ok && mode === "ai" && !g.isGameOver()) {
        setStatus("Frost Engine is thinking…");
        setTimeout(() => {
          const ai = pickAiMove(g.fen());
          if (ai) {
            g.move({ from: ai.from, to: ai.to, promotion: ai.promotion });
            setFen(g.fen());
            if (!finishIfOver()) computeStatus();
          }
        }, 420);
      }
      return ok;
    },
    [mode, tryMove, finishIfOver, computeStatus],
  );

  const reset = useCallback(() => {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setFinished(null);
    setStatus("Your move — white to play");
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {/* Mode + status bar */}
      <div className="flex w-full max-w-[560px] flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl glass p-1">
          <ModeBtn active={mode === "ai"} onClick={() => { setMode("ai"); reset(); }}>
            <Bot className="h-4 w-4" /> vs AI
          </ModeBtn>
          <ModeBtn active={mode === "hotseat"} onClick={() => { setMode("hotseat"); reset(); }}>
            <Users className="h-4 w-4" /> Hot-seat
          </ModeBtn>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl glass px-4 py-2 font-display text-sm tracking-wide text-ice-frost/80 hover:text-ice hover:shadow-ice"
        >
          <RotateCcw className="h-4 w-4" /> New game
        </button>
      </div>

      {/* Board */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="board-frame animate-drift"
      >
        <div ref={boardRef}>
          <Chessboard
            position={fen}
            onPieceDrop={onPieceDrop}
            boardWidth={boardWidth}
            animationDuration={250}
            customBoardStyle={{ borderRadius: "10px" }}
            customDarkSquareStyle={{ backgroundColor: "#0e2a3a" }}
            customLightSquareStyle={{ backgroundColor: "#16415a" }}
            customDropSquareStyle={{
              boxShadow: "inset 0 0 0 3px rgba(103,232,249,0.9)",
            }}
          />
        </div>
      </motion.div>

      <p className="font-display text-sm tracking-widest text-ice-frost/70">
        {status}
      </p>

      {finished && (
        <button
          onClick={() => {
            const el = document.getElementById("eternalize-anchor");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex items-center gap-2 rounded-xl bg-ice/90 px-5 py-2.5 font-display font-semibold tracking-wide text-void-900 shadow-ice-lg hover:bg-ice"
        >
          <Sparkles className="h-4 w-4" /> Game over — eternalize it
        </button>
      )}

      <span id="eternalize-anchor" />
      {finished && (
        <EternalizeModal
          game={finished}
          boardRef={boardRef}
          onClose={() => setFinished(null)}
        />
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 font-display text-sm tracking-wide transition ${
        active
          ? "bg-ice/90 text-void-900 shadow-ice"
          : "text-ice-frost/70 hover:text-ice"
      }`}
    >
      {children}
    </button>
  );
}
