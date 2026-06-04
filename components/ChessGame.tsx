"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { Bot, Users, RotateCcw, Sparkles, Wifi } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { pickAiMove, type Difficulty } from "@/lib/chess-ai";
import { EternalizeModal } from "./EternalizeModal";
import { OnlineRoom } from "./OnlineRoom";
import type { RoomState } from "@/lib/room";
import { roomChannel } from "@/lib/room";
import Pusher from "pusher-js";

type Mode = "ai" | "hotseat" | "online";

export interface FinishedGame {
  pgn: string;
  movesJson: string;
  fen: string;
  result: string;
  resultLabel: string;
  winner: string;
  moveCount: number;
  white: string;
  black: string;
  isOnlineWin?: boolean;   // true if this player won an online match
  isOnline?: boolean;      // true if game was played online (even a draw)
}

export function ChessGame() {
  const account = useCurrentAccount();
  const gameRef = useRef(new Chess());
  const boardRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  const [fen, setFen] = useState(gameRef.current.fen());
  const [mode, setMode] = useState<Mode>("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [status, setStatus] = useState("Your move — white to play");
  const [finished, setFinished] = useState<FinishedGame | null>(null);
  const [boardWidth, setBoardWidth] = useState(440);

  // Move highlighting
  const [optionSquares, setOptionSquares] = useState<Record<string, object>>({});
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Online mode
  const [showLobby, setShowLobby] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myColor, setMyColor] = useState<"white" | "black">("white");
  const [opponentConnected, setOpponentConnected] = useState(false);

  // Responsive board sizing
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

  // Cleanup Pusher on unmount
  useEffect(() => () => { pusherRef.current?.disconnect(); }, []);

  const whiteName = account?.address ?? "Guest (White)";
  const blackName =
    mode === "ai" ? "Frost Engine (AI)"
    : mode === "online" && room
      ? (myColor === "white" ? room.guestAddress ?? "Opponent" : room.hostAddress)
      : "Guest (Black)";

  const computeStatus = useCallback((chess?: Chess) => {
    const g = chess ?? gameRef.current;
    if (g.isGameOver()) return;
    const turn = g.turn() === "w" ? "White" : "Black";
    if (mode === "online") {
      const myTurn = (turn === "White" && myColor === "white") || (turn === "Black" && myColor === "black");
      setStatus(g.inCheck()
        ? `${turn} is in check!`
        : myTurn ? "Your turn" : "Opponent's turn…");
    } else {
      setStatus(g.inCheck() ? `${turn} is in check!` : `${turn} to move`);
    }
  }, [mode, myColor]);

  const finishIfOver = useCallback((chess?: Chess) => {
    const g = chess ?? gameRef.current;
    if (!g.isGameOver()) return false;

    let result = "1/2-1/2";
    let resultLabel = "Draw";
    let winner = "draw";

    if (g.isCheckmate()) {
      const whiteWon = g.turn() === "b";
      result = whiteWon ? "1-0" : "0-1";
      resultLabel = whiteWon ? "White wins by checkmate" : "Black wins by checkmate";
      winner = whiteWon ? whiteName : blackName;
    } else if (g.isStalemate()) resultLabel = "Draw — stalemate";
    else if (g.isThreefoldRepetition()) resultLabel = "Draw — threefold repetition";
    else if (g.isInsufficientMaterial()) resultLabel = "Draw — insufficient material";

    const verbose = g.history({ verbose: true });
    const isWinner = winner === (account?.address ?? "");

    setFinished({
      pgn: g.pgn(),
      movesJson: JSON.stringify({
        white: whiteName,
        black: blackName,
        result,
        playedAt: new Date().toISOString(),
        moves: verbose.map((m, i) => ({
          ply: i + 1, san: m.san, from: m.from, to: m.to,
          piece: m.piece, captured: m.captured ?? null, fenAfter: m.after,
        })),
      }, null, 2),
      fen: g.fen(),
      result,
      resultLabel,
      winner,
      moveCount: Math.ceil(verbose.length / 2),
      white: whiteName,
      black: blackName,
      isOnlineWin: mode === "online" && isWinner,
      isOnline: mode === "online",
    });
    return true;
  }, [whiteName, blackName, mode, account]);

  // ── Online: subscribe to Pusher after room is ready ──────────────────────
  const startOnlineGame = useCallback((roomState: RoomState, color: "white" | "black") => {
    setRoom(roomState);
    setMyColor(color);
    setShowLobby(false);
    setOpponentConnected(true);

    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setFinished(null);
    setOptionSquares({});
    setSelectedSquare(null);

    const isWhite = color === "white";
    setStatus(isWhite ? "Your turn" : "Opponent's turn…");

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    pusherRef.current = pusher;

    const ch = pusher.subscribe(roomChannel(roomState.code));

    ch.bind("move_made", (event: any) => {
      const g = gameRef.current;
      if (event.pgn) g.loadPgn(event.pgn);
      setFen(g.fen());
      computeStatus(g);
    });

    ch.bind("game_over", (event: any) => {
      const g = gameRef.current;
      if (event.pgn) g.loadPgn(event.pgn);
      setFen(g.fen());
      const verbose = g.history({ verbose: true });
      const isWinner = event.winner === (account?.address ?? "");
      setFinished({
        pgn: g.pgn(),
        movesJson: JSON.stringify({ white: roomState.hostAddress, black: roomState.guestAddress, result: event.result }, null, 2),
        fen: g.fen(),
        result: event.result,
        resultLabel: event.resultLabel,
        winner: event.winner,
        moveCount: Math.ceil(verbose.length / 2),
        white: roomState.hostAddress,
        black: roomState.guestAddress ?? "Opponent",
        isOnlineWin: isWinner,
      });
      setStatus(event.resultLabel);
      pusher.unsubscribe(roomChannel(roomState.code));
    });
  }, [computeStatus, account]);

  // ── Trigger AI move ───────────────────────────────────────────────────────
  const triggerAiMove = useCallback(() => {
    const g = gameRef.current;
    setStatus("Frost Engine is thinking…");
    setTimeout(() => {
      const ai = pickAiMove(g.fen(), difficulty);
      if (ai) {
        g.move({ from: ai.from, to: ai.to, promotion: ai.promotion });
        setFen(g.fen());
        if (!finishIfOver()) computeStatus();
      }
    }, 420);
  }, [difficulty, finishIfOver, computeStatus]);

  // ── Submit move to server (online mode) ──────────────────────────────────
  const submitOnlineMove = useCallback(async (from: string, to: string) => {
    if (!room || !account) return false;
    try {
      const res = await fetch("/api/room/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: room.code, from, to, promotion: "q", playerAddress: account.address }),
      });
      const data = await res.json();
      if (!res.ok) { console.error(data.error); return false; }
      // Optimistically apply move locally (Pusher will confirm to opponent)
      const g = gameRef.current;
      if (data.pgn) g.loadPgn(data.pgn);
      setFen(g.fen());
      if (!data.gameOver) computeStatus(g);
      return true;
    } catch {
      return false;
    }
  }, [room, account, computeStatus]);

  // ── tryMove (local) ───────────────────────────────────────────────────────
  const tryMove = useCallback((from: string, to: string) => {
    const g = gameRef.current;
    try {
      const mv = g.move({ from, to, promotion: "q" });
      if (!mv) return false;
    } catch { return false; }
    setFen(g.fen());
    if (!finishIfOver()) computeStatus();
    return true;
  }, [computeStatus, finishIfOver]);

  // ── Piece click → show valid squares ─────────────────────────────────────
  const onPieceClick = useCallback((piece: string, square: string) => {
    const g = gameRef.current;
    if (mode === "ai" && g.turn() !== "w") return;
    if (mode === "online") {
      const myTurn = (g.turn() === "w" && myColor === "white") || (g.turn() === "b" && myColor === "black");
      if (!myTurn) return;
    }
    const moves = g.moves({ square: square as Square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); setSelectedSquare(null); return; }
    setSelectedSquare(square);
    const highlights: Record<string, object> = {};
    moves.forEach((m) => {
      highlights[m.to] = {
        background: g.get(m.to)
          ? "radial-gradient(circle, rgba(103,232,249,0.55) 80%, transparent 80%)"
          : "radial-gradient(circle, rgba(103,232,249,0.4) 28%, transparent 28%)",
        borderRadius: "50%",
      };
    });
    highlights[square] = { background: "rgba(103,232,249,0.2)" };
    setOptionSquares(highlights);
  }, [mode, myColor]);

  // ── Square click → complete move ─────────────────────────────────────────
  const onSquareClick = useCallback(async (square: string) => {
    if (!selectedSquare || selectedSquare === square) {
      setOptionSquares({}); setSelectedSquare(null); return;
    }
    setOptionSquares({}); setSelectedSquare(null);

    if (mode === "online") {
      // Validate locally first (for visual feedback), then confirm server-side
      const g = gameRef.current;
      const legalMoves = g.moves({ square: selectedSquare as Square, verbose: true });
      const isLegal = legalMoves.some((m) => m.to === square);
      if (!isLegal) return;
      await submitOnlineMove(selectedSquare, square);
      return;
    }

    const moved = tryMove(selectedSquare, square);
    if (moved && mode === "ai" && !gameRef.current.isGameOver()) triggerAiMove();
  }, [selectedSquare, tryMove, mode, triggerAiMove, submitOnlineMove]);

  // ── Piece drop ────────────────────────────────────────────────────────────
  const onPieceDrop = useCallback(async (source: string, target: string) => {
    const g = gameRef.current;
    setOptionSquares({}); setSelectedSquare(null);

    if (mode === "online") {
      const myTurn = (g.turn() === "w" && myColor === "white") || (g.turn() === "b" && myColor === "black");
      if (!myTurn) return false;
      const ok = await submitOnlineMove(source, target);
      return ok ?? false;
    }

    if (mode === "ai" && g.turn() !== "w") return false;
    const ok = tryMove(source, target);
    if (ok && mode === "ai" && !g.isGameOver()) triggerAiMove();
    return ok;
  }, [mode, myColor, tryMove, triggerAiMove, submitOnlineMove]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setFinished(null);
    setStatus("Your move — white to play");
    setOptionSquares({});
    setSelectedSquare(null);
    setRoom(null);
    setShowLobby(false);
    pusherRef.current?.disconnect();
  }, []);

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    reset();
    if (m === "online") setShowLobby(true);
  }, [reset]);

  // ── Board orientation ─────────────────────────────────────────────────────
  const boardOrientation = mode === "online" && myColor === "black" ? "black" : "white";

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {/* Mode bar */}
      <div className="flex w-full max-w-[560px] flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl glass p-1">
          <ModeBtn active={mode === "ai"} onClick={() => switchMode("ai")}>
            <Bot className="h-4 w-4" /> vs AI
          </ModeBtn>
          <ModeBtn active={mode === "hotseat"} onClick={() => switchMode("hotseat")}>
            <Users className="h-4 w-4" /> Hot-seat
          </ModeBtn>
          <ModeBtn active={mode === "online"} onClick={() => switchMode("online")}>
            <Wifi className="h-4 w-4" /> Online
          </ModeBtn>
        </div>

        {/* Difficulty — AI mode only */}
        {mode === "ai" && (
          <div className="flex rounded-xl glass p-1">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); reset(); }}
                className={`rounded-lg px-3 py-2 font-display text-xs tracking-wide capitalize transition ${
                  difficulty === d ? "bg-ice/90 text-void-900 shadow-ice" : "text-ice-frost/70 hover:text-ice"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Online: room code badge */}
        {mode === "online" && room && (
          <div className="flex items-center gap-2 rounded-xl glass px-3 py-2">
            <span className="font-display text-xs text-ice-frost/50 tracking-widest uppercase">Room</span>
            <span className="font-mono text-sm font-bold tracking-wider text-ice">{room.code}</span>
          </div>
        )}

        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl glass px-4 py-2 font-display text-sm tracking-wide text-ice-frost/80 hover:text-ice hover:shadow-ice"
        >
          <RotateCcw className="h-4 w-4" /> New game
        </button>
      </div>

      {/* Online lobby */}
      {mode === "online" && showLobby && (
        <OnlineRoom onReady={startOnlineGame} />
      )}

      {/* Board — hide until online game is ready */}
      {(!showLobby || (mode !== "online")) && (
        <>
          {/* Online: opponent info */}
          {mode === "online" && room && (
            <div className="flex w-full max-w-[560px] items-center justify-between rounded-xl glass px-4 py-2">
              <PlayerTag
                address={myColor === "white" ? room.hostAddress : room.guestAddress ?? "?"}
                label="You"
                color={myColor}
              />
              <span className="font-display text-xs text-ice-frost/30 tracking-widest">VS</span>
              <PlayerTag
                address={myColor === "white" ? (room.guestAddress ?? "Waiting…") : room.hostAddress}
                label="Opponent"
                color={myColor === "white" ? "black" : "white"}
              />
            </div>
          )}

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
                onPieceClick={onPieceClick}
                onSquareClick={onSquareClick}
                boardOrientation={boardOrientation}
                boardWidth={boardWidth}
                animationDuration={250}
                customBoardStyle={{ borderRadius: "10px" }}
                customDarkSquareStyle={{ backgroundColor: "#0e2a3a" }}
                customLightSquareStyle={{ backgroundColor: "#16415a" }}
                customDropSquareStyle={{ boxShadow: "inset 0 0 0 3px rgba(103,232,249,0.9)" }}
                customSquareStyles={optionSquares}
              />
            </div>
          </motion.div>

          <p className="font-display text-sm tracking-widest text-ice-frost/70">{status}</p>

          {finished && (
            <button
              onClick={() => {
                const el = document.getElementById("eternalize-anchor");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-2 rounded-xl bg-ice/90 px-5 py-2.5 font-display font-semibold tracking-wide text-void-900 shadow-ice-lg hover:bg-ice"
            >
              <Sparkles className="h-4 w-4" />
              {finished.isOnlineWin ? "🏆 You won! Eternalize it" : "Game over — eternalize it"}
            </button>
          )}
        </>
      )}

      <span id="eternalize-anchor" />
      {finished && (
        <EternalizeModal
          game={finished}
          boardRef={boardRef}
          difficulty={mode === "online" ? "human" : difficulty}
          onClose={() => setFinished(null)}
        />
      )}
    </div>
  );
}

function PlayerTag({ address, label, color }: { address: string; label: string; color: "white" | "black" }) {
  const short = address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-display text-xs text-ice-frost/40 tracking-widest uppercase">{label} · {color}</span>
      <span className="font-mono text-xs text-ice">{short}</span>
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 font-display text-sm tracking-wide transition ${
        active ? "bg-ice/90 text-void-900 shadow-ice" : "text-ice-frost/70 hover:text-ice"
      }`}
    >
      {children}
    </button>
  );
}