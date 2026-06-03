"use client";

import { motion } from "framer-motion";
import { ExternalLink, PlayCircle } from "lucide-react";
import type { EternalGame } from "@/lib/types";
import { explorerObject } from "@/lib/constants";

export function GameCard({
  game,
  onReplay,
}: {
  game: EternalGame;
  onReplay: () => void;
}) {
  const resultLabel =
    game.result === "1-0"
      ? "White won"
      : game.result === "0-1"
        ? "Black won"
        : "Draw";

  return (
    <motion.div
      whileHover={{ rotateX: 4, rotateY: -4, y: -4 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      style={{ transformStyle: "preserve-3d" }}
      className="group glass overflow-hidden rounded-2xl"
    >
      <div className="relative">
        {game.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.image_url}
            alt="Eternalized board"
            className="aspect-square w-full object-cover opacity-90 transition group-hover:opacity-100"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-ice-frost/40">
            no preview
          </div>
        )}
        <button
          onClick={onReplay}
          className="absolute inset-0 flex items-center justify-center bg-void-900/60 opacity-0 transition group-hover:opacity-100"
        >
          <span className="flex items-center gap-2 rounded-xl bg-ice/90 px-4 py-2 font-display text-sm font-semibold text-void-900">
            <PlayCircle className="h-4 w-4" /> Replay
          </span>
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm tracking-wide text-ice-frost">
            {resultLabel}
          </span>
          <span className="text-xs text-ice-frost/50">{game.move_count} moves</span>
        </div>
        <a
          href={explorerObject(game.objectId)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-1 truncate font-mono text-xs text-ice/80 hover:underline"
        >
          <span className="truncate">{game.objectId}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </div>
    </motion.div>
  );
}
