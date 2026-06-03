"use client";

import { useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import type { EternalGame } from "@/lib/types";
import { blobUrl } from "@/lib/constants";

export function ReplayViewer({
  game,
  onClose,
}: {
  game: EternalGame;
  onClose: () => void;
}) {
  const [fens, setFens] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(blobUrl(game.pgn_blob_id));
        if (!res.ok) throw new Error(`Walrus read failed (${res.status})`);
        const pgn = await res.text();
        const g = new Chess();
        g.loadPgn(pgn);
        const verbose = g.history({ verbose: true });
        const start = new Chess().fen();
        const positions = [start, ...verbose.map((m) => m.after)];
        if (!cancelled) {
          setFens(positions);
          setIdx(positions.length - 1);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load replay");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [game.pgn_blob_id]);

  const fen = useMemo(() => fens[idx] ?? new Chess().fen(), [fens, idx]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass-strong relative w-full max-w-md rounded-2xl p-6 shadow-ice-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ice-frost/50 hover:text-ice"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-display text-lg tracking-wide text-ice-frost text-glow">
          Replay · {game.result}
        </h3>

        {loading ? (
          <div className="flex h-72 items-center justify-center text-ice">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : err ? (
          <p className="mt-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            {err}
          </p>
        ) : (
          <>
            <div className="board-frame mt-4">
              <Chessboard
                position={fen}
                arePiecesDraggable={false}
                boardWidth={320}
                customDarkSquareStyle={{ backgroundColor: "#0e2a3a" }}
                customLightSquareStyle={{ backgroundColor: "#16415a" }}
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="font-display text-xs text-ice-frost/60">
                {idx}/{fens.length - 1}
              </span>
              <input
                type="range"
                min={0}
                max={fens.length - 1}
                value={idx}
                onChange={(e) => setIdx(Number(e.target.value))}
                className="w-full accent-ice"
              />
            </div>
            <p className="mt-3 text-center text-xs text-ice-frost/50">
              Loaded live from Walrus · blob {game.pgn_blob_id.slice(0, 10)}…
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
