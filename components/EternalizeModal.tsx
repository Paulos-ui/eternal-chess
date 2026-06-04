"use client";

import { useState, type RefObject } from "react";
import { toPng } from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  Loader2, CheckCircle2, AlertTriangle, ExternalLink,
  Camera, UploadCloud, Boxes, X, Trophy,
} from "lucide-react";
import type { FinishedGame } from "./ChessGame";
import { uploadToWalrus, jsonBlob, textBlob } from "@/lib/walrus";
import { makeSuiClient } from "@/lib/sui";
import {
  PACKAGE_ID, MODULE, blobUrl, explorerObject, explorerTx, ETERNAL_GAME_TYPE,
} from "@/lib/constants";

type Phase = "ready" | "capturing" | "uploading" | "minting" | "done" | "error";

interface Success {
  digest: string;
  objectId: string | null;
  pgnBlobId: string;
  boardBlobId: string;
  movesBlobId: string;
  imageUrl: string;
  trophy: TrophyTier;
}

// level matches the on-chain u8 value in the Move contract
type TrophyTier = {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
  emoji: string;
  color: string;         // Tailwind text color
  glowColor: string;     // Tailwind ring/shadow color
  description: string;   // shown in the modal
};

const TROPHIES: TrophyTier[] = [
  {
    level: 0,
    label: "Bronze",
    emoji: "🥉",
    color: "text-orange-400",
    glowColor: "ring-orange-400/30",
    description: "Any game ≥ 25 moves",
  },
  {
    level: 1,
    label: "Silver",
    emoji: "🥈",
    color: "text-slate-300",
    glowColor: "ring-slate-300/30",
    description: "Checkmate in ≥ 50 moves",
  },
  {
    level: 2,
    label: "Gold",
    emoji: "🥇",
    color: "text-yellow-400",
    glowColor: "ring-yellow-400/30",
    description: "Checkmate in ≥ 80 moves vs Hard AI or Human",
  },
  {
    level: 3,
    label: "Diamond",
    emoji: "💎",
    color: "text-cyan-300",
    glowColor: "ring-cyan-300/30",
    description: "Checkmate vs Human in ≥ 60 moves",
  },
  {
    level: 4,
    label: "Legendary",
    emoji: "👑",
    color: "text-yellow-200",
    glowColor: "ring-yellow-200/30",
    description: "Checkmate vs Human in ≥ 100 moves",
  },
  {
    level: 5,
    label: "Emeritus",
    emoji: "🎖️",
    color: "text-purple-300",
    glowColor: "ring-purple-300/40",
    description: "Checkmate vs Human in ≥ 150 moves — near impossible",
  },
];

function getTrophy(game: FinishedGame, difficulty: string): TrophyTier {
  const isCheckmate = game.result === "1-0" || game.result === "0-1";
  const isOnline = game.isOnlineWin === true || game.isOnline === true;
  const isHard = difficulty === "hard";
  const m = game.moveCount;

  if (isOnline && isCheckmate && m >= 150) return TROPHIES[5]; // Emeritus
  if (isOnline && isCheckmate && m >= 100) return TROPHIES[4]; // Legendary
  if (isOnline && isCheckmate && m >= 60)  return TROPHIES[3]; // Diamond
  if (isCheckmate && m >= 80 && (isHard || isOnline)) return TROPHIES[2]; // Gold
  if (isCheckmate && m >= 50) return TROPHIES[1]; // Silver
  return TROPHIES[0]; // Bronze
}

export function EternalizeModal({
  game,
  boardRef,
  difficulty = "easy",
  onClose,
}: {
  game: FinishedGame;
  boardRef: RefObject<HTMLDivElement>;
  difficulty?: string;
  onClose: () => void;
}) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<Success | null>(null);

  const needsWallet = !account;
  const needsPackage = !PACKAGE_ID || PACKAGE_ID === "0x0";
  const tooFewMoves = game.moveCount < 25;
  const trophy = getTrophy(game, difficulty);

  async function eternalize() {
    if (needsWallet || needsPackage || tooFewMoves) return;
    setError("");

    try {
      // 1 — Capture board PNG
      setPhase("capturing");
      const node = boardRef.current;
      if (!node) throw new Error("Board not found for capture");
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#05070f" });
      const boardPng = await (await fetch(dataUrl)).blob();

      // 2 — Upload all artifacts to Walrus
      setPhase("uploading");
      const stamp = Date.now();
      const [board, pgn, moves] = await Promise.all([
        uploadToWalrus(boardPng, `eternal-${stamp}.png`, account!.address),
        uploadToWalrus(textBlob(game.pgn), `eternal-${stamp}.pgn`, account!.address),
        uploadToWalrus(jsonBlob(JSON.parse(game.movesJson)), `eternal-${stamp}.json`, account!.address),
      ]);
      const imageUrl = blobUrl(board.blobId);

      // 3 — Mint on Sui
      setPhase("minting");
      const isOnline = game.isOnlineWin === true || game.isOnline === true;
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE}::eternalize`,
        arguments: [
          tx.pure.string(game.white),
          tx.pure.string(game.black),
          tx.pure.string(game.result),
          tx.pure.string(game.winner),
          tx.pure.u64(BigInt(game.moveCount)),
          tx.pure.u64(BigInt(stamp)),
          tx.pure.string(pgn.blobId),
          tx.pure.string(board.blobId),
          tx.pure.string(moves.blobId),
          tx.pure.string(imageUrl),
          tx.pure.bool(isOnline),
          tx.pure.string(isOnline ? "human" : difficulty),
        ],
      });

      const res = await signAndExecute({ transaction: tx });

      let objectId: string | null = null;
      try {
        const client = makeSuiClient();
        await client.waitForTransaction({ digest: res.digest });
        const full = await client.getTransactionBlock({
          digest: res.digest,
          options: { showObjectChanges: true },
        });
        const created = full.objectChanges?.find(
          (c) => c.type === "created" && "objectType" in c && c.objectType === ETERNAL_GAME_TYPE,
        );
        if (created && "objectId" in created) objectId = created.objectId;
      } catch { /* non-fatal */ }

      setSuccess({
        digest: res.digest,
        objectId,
        pgnBlobId: pgn.blobId,
        boardBlobId: board.blobId,
        movesBlobId: moves.blobId,
        imageUrl,
        trophy,
      });
      setPhase("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="glass-strong relative w-full max-w-lg rounded-2xl p-7 shadow-ice-lg overflow-y-auto max-h-[90vh]"
        >
          <button onClick={onClose} className="absolute right-4 top-4 text-ice-frost/50 hover:text-ice">
            <X className="h-5 w-5" />
          </button>

          <h2 className="font-display text-2xl font-bold tracking-wide text-ice-frost text-glow">
            {game.resultLabel}
          </h2>
          <p className="mt-1 text-sm text-ice-frost/60">
            {game.moveCount} moves · {game.result}
          </p>

          {/* Trophy tier badge */}
          <div className={`mt-4 flex items-center gap-3 rounded-xl bg-void-700/60 ring-1 ${trophy.glowColor} px-4 py-3`}>
            <span className="text-2xl">{trophy.emoji}</span>
            <div>
              <p className={`font-display font-bold tracking-wide ${trophy.color}`}>
                {trophy.label} NFT
              </p>
              <p className="text-xs text-ice-frost/50">{trophy.description}</p>
            </div>
            {(game.isOnlineWin || game.isOnline) && (
              <span className="ml-auto rounded-md bg-ice/10 px-2 py-1 text-xs text-ice border border-ice/20">
                vs Human
              </span>
            )}
          </div>

          {/* Trophy ladder — shows all tiers so user knows what they earned and what's next */}
          {phase === "ready" && (
            <div className="mt-5 space-y-1.5">
              <p className="text-xs font-display tracking-widest uppercase text-ice-frost/40 mb-2">Trophy Ladder</p>
              {TROPHIES.slice().reverse().map((t) => {
                const isEarned = t.level === trophy.level;
                const isPast = t.level < trophy.level;
                return (
                  <div
                    key={t.level}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition ${
                      isEarned
                        ? `bg-void-700/80 ring-1 ${t.glowColor}`
                        : "opacity-40"
                    }`}
                  >
                    <span className="text-base w-5 text-center">{t.emoji}</span>
                    <span className={`font-display font-semibold w-20 ${isEarned ? t.color : "text-ice-frost/60"}`}>
                      {t.label}
                    </span>
                    <span className="text-ice-frost/50 flex-1">{t.description}</span>
                    {isEarned && (
                      <span className={`font-bold ${t.color}`}>✓ Earned</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {phase !== "done" && (
            <>
              {phase !== "ready" && (
                <div className="mt-6 space-y-3">
                  <Step icon={Camera} label="Capture final board" active={phase === "capturing"} done={["uploading", "minting"].includes(phase)} />
                  <Step icon={UploadCloud} label="Store replay on Walrus" active={phase === "uploading"} done={phase === "minting"} />
                  <Step icon={Boxes} label="Mint Sui object via Tatum RPC" active={phase === "minting"} done={false} />
                </div>
              )}

              {needsWallet && (
                <p className="mt-5 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
                  Connect a Sui wallet to eternalize this game.
                </p>
              )}
              {needsPackage && !needsWallet && (
                <p className="mt-5 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
                  Set <code>NEXT_PUBLIC_PACKAGE_ID</code> after publishing the Move package.
                </p>
              )}
              {tooFewMoves && !needsWallet && !needsPackage && (
                <p className="mt-5 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
                  Games must be at least 25 moves to mint. Keep playing — Bronze awaits!
                </p>
              )}

              <button
                disabled={needsWallet || needsPackage || tooFewMoves || ["capturing", "uploading", "minting"].includes(phase)}
                onClick={eternalize}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ice px-5 py-3 font-display font-semibold tracking-wide text-void-900 shadow-ice-lg transition hover:bg-ice-bright disabled:opacity-40"
              >
                {["capturing", "uploading", "minting"].includes(phase) ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Eternalizing…</>
                ) : (
                  <>Eternalize &amp; Mint {trophy.emoji} {trophy.label} NFT</>
                )}
              </button>

              {phase === "error" && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
              )}
            </>
          )}

          {phase === "done" && success && (
            <SuccessView game={game} success={success} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Step({ icon: Icon, label, active, done }: { icon: React.ElementType; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
        done ? "border-ice bg-ice/20 text-ice"
        : active ? "border-ice bg-ice/10 text-ice animate-frost-pulse"
        : "border-ice/15 text-ice-frost/40"
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className={`text-sm ${done || active ? "text-ice-frost" : "text-ice-frost/50"}`}>{label}</span>
    </div>
  );
}

function SuccessView({ game, success }: { game: FinishedGame; success: Success }) {
  return (
    <div className="mt-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2 text-ice"
      >
        <CheckCircle2 className="h-6 w-6" />
        <span className="font-display text-lg font-semibold tracking-wide">Frozen in eternity.</span>
      </motion.div>

      <div className={`mt-3 flex items-center gap-3 rounded-xl bg-void-700/60 ring-1 ${success.trophy.glowColor} px-4 py-3`}>
        <span className="text-2xl">{success.trophy.emoji}</span>
        <div>
          <p className={`font-display font-bold ${success.trophy.color}`}>{success.trophy.label} NFT minted</p>
          <p className="text-xs text-ice-frost/50">{success.trophy.description}</p>
        </div>
        {(game.isOnlineWin || game.isOnline) && (
          <span className="ml-auto text-xs text-ice border border-ice/20 rounded-md px-2 py-1">
            vs Human · higher value
          </span>
        )}
      </div>

      <img
        src={success.imageUrl}
        alt="Eternalized board"
        className="mt-4 w-full rounded-xl border border-ice/30 shadow-ice"
      />

      <div className="mt-4 space-y-2 text-sm">
        <LinkRow label="Sui object" href={success.objectId ? explorerObject(success.objectId) : explorerTx(success.digest)} value={success.objectId ?? success.digest} />
        <LinkRow label="Board blob" href={blobUrl(success.boardBlobId)} value={success.boardBlobId} />
        <LinkRow label="PGN blob" href={blobUrl(success.pgnBlobId)} value={success.pgnBlobId} />
        <LinkRow label="Moves blob" href={blobUrl(success.movesBlobId)} value={success.movesBlobId} />
      </div>

      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `I just minted a ${success.trophy.emoji} ${success.trophy.label} chess NFT on @SuiNetwork with @WalrusFoundation storage ♟️❄️ ${game.resultLabel} in ${game.moveCount} moves`,
        )}`}
        target="_blank"
        rel="noreferrer"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-ice/40 px-5 py-3 font-display tracking-wide text-ice hover:bg-ice/10"
      >
        Share on X
      </a>
    </div>
  );
}

function LinkRow({ label, href, value }: { label: string; href: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-void-700/60 px-3 py-2">
      <span className="font-display text-xs uppercase tracking-widest text-ice-frost/50">{label}</span>
      <a href={href} target="_blank" rel="noreferrer"
        className="flex items-center gap-1 truncate font-mono text-xs text-ice hover:underline">
        <span className="max-w-[180px] truncate">{value}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    </div>
  );
}
