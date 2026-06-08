"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { Bot, Users, RotateCcw, Sparkles, Wifi, Maximize2, Minimize2 } from "lucide-react";
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
  isOnlineWin?: boolean;
  isOnline?: boolean;
}

export function ChessGame() {
  const account = useCurrentAccount();
  const gameRef = useRef(new Chess());
  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  const [fen, setFen] = useState(gameRef.current.fen());
  const [mode, setMode] = useState<Mode>("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [status, setStatus] = useState("Your move — white to play");
  const [finished, setFinished] = useState<FinishedGame | null>(null);
  const [boardWidth, setBoardWidth] = useState(480);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Move highlighting — click-to-move
  const [optionSquares, setOptionSquares] = useState<Record<string, object>>({});
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Online mode
  const [showLobby, setShowLobby] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myColor, setMyColor] = useState<"white" | "black">("white");
  const [opponentConnected, setOpponentConnected] = useState(false);

  // ── Board sizing: responds to container width AND fullscreen ──────────────
  useEffect(() => {
    function measure() {
      if (isFullscreen) {
        // In fullscreen, fit the board to the viewport height with some padding
        const size = Math.min(window.innerWidth, window.innerHeight) - 160;
        setBoardWidth(Math.max(320, size));
      } else {
        const el = boardRef.current?.parentElement;
        if (!el) return;
        const w = Math.min(el.clientWidth - 28, 600);
        setBoardWidth(Math.max(300, w));
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (boardRef.current?.parentElement) ro.observe(boardRef.current.parentElement);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [isFullscreen]);

  // ── Fullscreen API ────────────────────────────────────────────────────────
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
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
      const g = gameRef.current;
      if (data.pgn) g.loadPgn(data.pgn);
      setFen(g.fen());
      if (!data.gameOver) computeStatus(g);
      return true;
    } catch {
      return false;
    }
  }, [room, account, computeStatus]);

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

  // ── Highlight valid squares for a given piece square ─────────────────────
  const highlightMoves = useCallback((square: string) => {
    const g = gameRef.current;
    const moves = g.moves({ square: square as Square, verbose: true });
    if (moves.length === 0) return false;
    const highlights: Record<string, object> = {};
    moves.forEach((m) => {
      highlights[m.to] = {
        background: g.get(m.to)
          ? "radial-gradient(circle, rgba(228, 228, 228, 0.6) 80%, transparent 80%)"
          : "radial-gradient(circle, rgba(103,232,249,0.4) 28%, transparent 28%)",
        borderRadius: "50%",
      };
    });
    highlights[square] = { background: "rgba(103,232,249,0.22)" };
    setOptionSquares(highlights);
    setSelectedSquare(square);
    return true;
  }, []);

  // ── Check if it's this player's turn ─────────────────────────────────────
  const isMyTurn = useCallback(() => {
    const g = gameRef.current;
    if (mode === "ai") return g.turn() === "w";
    if (mode === "online") {
      return (g.turn() === "w" && myColor === "white") || (g.turn() === "b" && myColor === "black");
    }
    return true; // hotseat: always allowed
  }, [mode, myColor]);

  // ── onSquareClick: handles BOTH selecting a piece AND moving to a square ──
  // This is the core of click-to-move. When a square is clicked:
  //  1. If a piece is already selected and the clicked square is a valid move → move
  //  2. If the clicked square has a friendly piece → select it (show highlights)
  //  3. Otherwise → clear selection
  const onSquareClick = useCallback(async (square: string) => {
    const g = gameRef.current;
    if (!isMyTurn()) return;

    // Case 1: a piece is already selected — try to move to this square
    if (selectedSquare) {
      // If clicking the same square, deselect
      if (selectedSquare === square) {
        setOptionSquares({});
        setSelectedSquare(null);
        return;
      }

      // Check if this is a valid destination
      const legalMoves = g.moves({ square: selectedSquare as Square, verbose: true });
      const isLegal = legalMoves.some((m) => m.to === square);

      if (isLegal) {
        // Execute the move
        setOptionSquares({});
        setSelectedSquare(null);

        if (mode === "online") {
          await submitOnlineMove(selectedSquare, square);
        } else {
          const moved = tryMove(selectedSquare, square);
          if (moved && mode === "ai" && !gameRef.current.isGameOver()) triggerAiMove();
        }
        return;
      }

      // Not a legal destination — maybe they're clicking a different friendly piece?
      const piece = g.get(square as Square);
      const myPieceColor = g.turn();
      if (piece && piece.color === myPieceColor) {
        // Re-select the new piece
        highlightMoves(square);
        return;
      }

      // Clicked empty/enemy non-capture — clear selection
      setOptionSquares({});
      setSelectedSquare(null);
      return;
    }

    // Case 2: nothing selected — select the piece on this square
    const piece = g.get(square as Square);
    if (!piece) return;
    if (piece.color !== g.turn()) return;
    highlightMoves(square);
  }, [selectedSquare, isMyTurn, mode, tryMove, triggerAiMove, submitOnlineMove, highlightMoves]);

  // ── onPieceClick: triggers the same selection logic as onSquareClick ──────
  // react-chessboard fires onPieceClick before onSquareClick, so we let
  // onSquareClick handle everything — this just prevents double-firing.
  const onPieceClick = useCallback((_piece: string, square: string) => {
    // Handled entirely by onSquareClick — no-op here to avoid duplicate calls
  }, []);

  // ── Drag and drop still works alongside click-to-move ────────────────────
  const onPieceDrop = useCallback(async (source: string, target: string) => {
    const g = gameRef.current;
    setOptionSquares({});
    setSelectedSquare(null);

    if (!isMyTurn()) return false;

    if (mode === "online") {
      const ok = await submitOnlineMove(source, target);
      return ok ?? false;
    }

    const ok = tryMove(source, target);
    if (ok && mode === "ai" && !g.isGameOver()) triggerAiMove();
    return ok;
  }, [isMyTurn, mode, tryMove, triggerAiMove, submitOnlineMove]);

  // ── Online: start game after room is ready ────────────────────────────────
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
    setStatus(color === "white" ? "Your turn" : "Opponent's turn…");

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
        isOnline: true,
      });
      setStatus(event.resultLabel);
      pusher.unsubscribe(roomChannel(roomState.code));
    });
  }, [computeStatus, account]);

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

  const boardOrientation = mode === "online" && myColor === "black" ? "black" : "white";

  return (
    <div className="flex w-full flex-col items-center gap-5">

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="flex w-full max-w-[640px] flex-wrap items-center justify-between gap-3">
        {/* Mode selector */}
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

        {/* Online room code badge */}
        {mode === "online" && room && (
          <div className="flex items-center gap-2 rounded-xl glass px-3 py-2">
            <span className="font-display text-xs text-ice-frost/50 tracking-widest uppercase">Room</span>
            <span className="font-mono text-sm font-bold tracking-wider text-ice">{room.code}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex items-center gap-1.5 rounded-xl glass px-3 py-2 font-display text-sm tracking-wide text-ice-frost/60 hover:text-ice hover:shadow-ice transition"
          >
            {isFullscreen
              ? <Minimize2 className="h-4 w-4" />
              : <Maximize2 className="h-4 w-4" />
            }
          </button>

          {/* New game */}
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-xl glass px-4 py-2 font-display text-sm tracking-wide text-ice-frost/80 hover:text-ice hover:shadow-ice transition"
          >
            <RotateCcw className="h-4 w-4" /> New game
          </button>
        </div>
      </div>

      {/* Online lobby */}
      {mode === "online" && showLobby && (
        <OnlineRoom onReady={startOnlineGame} />
      )}

      {/* ── Board area ───────────────────────────────────────────────────── */}
      {(!showLobby || mode !== "online") && (
        <>
          {/* Online opponent strip */}
          {mode === "online" && room && (
            <div className="flex w-full max-w-[640px] items-center justify-between rounded-xl glass px-4 py-2">
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

          {/* Click-to-move hint */}
          {!isFullscreen && (
            <p className="text-xs text-ice-frost/35 font-display tracking-widest">
              Click a piece to select · click a destination to move · or drag
            </p>
          )}

          {/* Board container — fullscreen target */}
          <div
            ref={containerRef}
            className={`relative flex flex-col items-center justify-center gap-4 ${
              isFullscreen
                ? "w-screen h-screen bg-[#05070f]"
                : ""
            }`}
          >
            {/* Fullscreen controls overlay */}
            {isFullscreen && (
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <span className="font-display text-xs text-ice-frost/40 tracking-widest">{status}</span>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-xl glass px-3 py-2 text-xs text-ice-frost/70 hover:text-ice transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> New
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 rounded-xl glass px-3 py-2 text-xs text-ice-frost/70 hover:text-ice transition"
                >
                  <Minimize2 className="h-3.5 w-3.5" /> Exit
                </button>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="board-frame"
            >
              <div ref={boardRef}>
                <Chessboard
                  position={fen}
                  onPieceDrop={onPieceDrop}
                  onPieceClick={onPieceClick}
                  onSquareClick={onSquareClick}
                  boardOrientation={boardOrientation}
                  boardWidth={boardWidth}
                  animationDuration={220}
                  customBoardStyle={{ borderRadius: "10px" }}
                  customDarkSquareStyle={{ backgroundColor: "#0e2a3a" }}
                  customLightSquareStyle={{ backgroundColor: "#16415a" }}
                  customDropSquareStyle={{ boxShadow: "inset 0 0 0 3px rgba(103,232,249,0.9)" }}
                  customSquareStyles={optionSquares}
                />
              </div>
            </motion.div>

            {/* Status — shown inside fullscreen too */}
            {!isFullscreen && (
              <p className="font-display text-sm tracking-widest text-ice-frost/70">{status}</p>
            )}
          </div>

          {finished && (
            <button
              onClick={() => {
                if (isFullscreen) document.exitFullscreen().catch(() => {});
                setTimeout(() => {
                  document.getElementById("eternalize-anchor")?.scrollIntoView({ behavior: "smooth" });
                }, 300);
              }}
              className="flex items-center gap-2 rounded-xl bg-ice/90 px-5 py-2.5 font-display font-semibold tracking-wide text-void-900 shadow-ice-lg hover:bg-ice transition"
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