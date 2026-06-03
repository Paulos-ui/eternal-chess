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
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Camera,
  UploadCloud,
  Boxes,
  X,
} from "lucide-react";
import type { FinishedGame } from "./ChessGame";
import { uploadToWalrus, jsonBlob, textBlob } from "@/lib/walrus";
import { makeSuiClient } from "@/lib/sui";
import {
  PACKAGE_ID,
  MODULE,
  blobUrl,
  explorerObject,
  explorerTx,
  ETERNAL_GAME_TYPE,
} from "@/lib/constants";

type Phase = "ready" | "capturing" | "uploading" | "minting" | "done" | "error";

interface Success {
  digest: string;
  objectId: string | null;
  pgnBlobId: string;
  boardBlobId: string;
  movesBlobId: string;
  imageUrl: string;
}

export function EternalizeModal({
  game,
  boardRef,
  onClose,
}: {
  game: FinishedGame;
  boardRef: RefObject<HTMLDivElement>;
  onClose: () => void;
}) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<Success | null>(null);

  const needsWallet = !account;
  const needsPackage = !PACKAGE_ID || PACKAGE_ID === "0x0";

  async function eternalize() {
    if (needsWallet || needsPackage) return;
    setError("");

    try {
      // 1 ── Capture the final board as a PNG blob.
      setPhase("capturing");
      const node = boardRef.current;
      if (!node) throw new Error("Board not found for capture");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#05070f",
      });
      const boardPng = await (await fetch(dataUrl)).blob();

      // 2 ── Upload all three artifacts to Walrus (owned by the player).
      setPhase("uploading");
      const stamp = Date.now();
      const [board, pgn, moves] = await Promise.all([
        uploadToWalrus(boardPng, `eternal-${stamp}.png`, account!.address),
        uploadToWalrus(textBlob(game.pgn), `eternal-${stamp}.pgn`, account!.address),
        uploadToWalrus(
          jsonBlob(JSON.parse(game.movesJson)),
          `eternal-${stamp}.json`,
          account!.address,
        ),
      ]);
      const imageUrl = blobUrl(board.blobId);

      // 3 ── Mint the on-chain EternalGame object via a Tatum-routed transaction.
      setPhase("minting");
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
        ],
      });

      const res = await signAndExecute({ transaction: tx });

      // Resolve the created object id (best-effort, via the Tatum proxy).
      let objectId: string | null = null;
      try {
        const client = makeSuiClient();
        await client.waitForTransaction({ digest: res.digest });
        const full = await client.getTransactionBlock({
          digest: res.digest,
          options: { showObjectChanges: true },
        });
        const created = full.objectChanges?.find(
          (c) =>
            c.type === "created" &&
            "objectType" in c &&
            c.objectType === ETERNAL_GAME_TYPE,
        );
        if (created && "objectId" in created) objectId = created.objectId;
      } catch {
        /* non-fatal: we still have the digest */
      }

      setSuccess({
        digest: res.digest,
        objectId,
        pgnBlobId: pgn.blobId,
        boardBlobId: board.blobId,
        movesBlobId: moves.blobId,
        imageUrl,
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
          className="glass-strong relative w-full max-w-lg rounded-2xl p-7 shadow-ice-lg"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-ice-frost/50 hover:text-ice"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="font-display text-2xl font-bold tracking-wide text-ice-frost text-glow">
            {game.resultLabel}
          </h2>
          <p className="mt-1 text-sm text-ice-frost/60">
            {game.moveCount} moves · {game.result}
          </p>

          {phase !== "done" && (
            <>
              <div className="mt-6 space-y-3">
                <Step icon={Camera} label="Capture final board" active={phase === "capturing"} done={["uploading", "minting"].includes(phase)} />
                <Step icon={UploadCloud} label="Store replay on Walrus" active={phase === "uploading"} done={phase === "minting"} />
                <Step icon={Boxes} label="Mint Sui object via Tatum RPC" active={phase === "minting"} done={false} />
              </div>

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

              <button
                disabled={
                  needsWallet ||
                  needsPackage ||
                  ["capturing", "uploading", "minting"].includes(phase)
                }
                onClick={eternalize}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-ice px-5 py-3 font-display font-semibold tracking-wide text-void-900 shadow-ice-lg transition hover:bg-ice-bright disabled:opacity-40"
              >
                {["capturing", "uploading", "minting"].includes(phase) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Eternalizing…
                  </>
                ) : (
                  <>Eternalize &amp; Mint NFT</>
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

function Step({
  icon: Icon,
  label,
  active,
  done,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
          done
            ? "border-ice bg-ice/20 text-ice"
            : active
              ? "border-ice bg-ice/10 text-ice animate-frost-pulse"
              : "border-ice/15 text-ice-frost/40"
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className={`text-sm ${done || active ? "text-ice-frost" : "text-ice-frost/50"}`}>
        {label}
      </span>
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
        <span className="font-display text-lg font-semibold tracking-wide">
          Frozen in eternity.
        </span>
      </motion.div>

      {/* The NFT image IS the Walrus blob. */}
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
          `I just eternalized a chess game forever on @SuiNetwork with @WalrusFoundation storage, powered by @Tatum_io ♟️❄️ ${game.resultLabel}`,
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
      <span className="font-display text-xs uppercase tracking-widest text-ice-frost/50">
        {label}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 truncate font-mono text-xs text-ice hover:underline"
      >
        <span className="max-w-[180px] truncate">{value}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    </div>
  );
}
