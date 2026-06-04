"use client";

/**
 * components/OnlineRoom.tsx
 *
 * Lobby UI — lets the user create a room (host) or join one with a code (guest).
 * Once both players are present it calls onReady() with the room state.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Loader2, Users, ArrowRight, Wifi } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import type { RoomState } from "@/lib/room";
import { roomChannel } from "@/lib/room";
import Pusher from "pusher-js";

interface Props {
  onReady: (room: RoomState, myColor: "white" | "black") => void;
}

export function OnlineRoom({ onReady }: Props) {
  const account = useCurrentAccount();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");           // room code input (join tab)
  const [createdCode, setCreatedCode] = useState("");  // code shown to host
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);  // host waiting for guest
  const pusherRef = useRef<Pusher | null>(null);

  // Cleanup Pusher on unmount
  useEffect(() => () => { pusherRef.current?.disconnect(); }, []);

  const address = account?.address;

  async function handleCreate() {
    if (!address) { setError("Connect your wallet first"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedCode(data.code);
      setWaiting(true);
      subscribeAsHost(data.code);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function subscribeAsHost(roomCode: string) {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    pusherRef.current = pusher;
    const ch = pusher.subscribe(roomChannel(roomCode));
    ch.bind("room_joined", (event: any) => {
      const room: RoomState = {
        code: roomCode,
        hostAddress: address!,
        guestAddress: event.guestAddress,
        hostColor: "white",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        pgn: "",
        status: "playing",
        createdAt: Date.now(),
        winner: null,
        result: null,
      };
      pusher.unsubscribe(roomChannel(roomCode));
      onReady(room, "white");
    });
  }

  async function handleJoin() {
    if (!address) { setError("Connect your wallet first"); return; }
    if (!code.trim()) { setError("Enter a room code"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), guestAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onReady(data.room as RoomState, "black");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="glass rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-ice">
          <Wifi className="h-5 w-5" />
          <span className="font-display text-lg font-semibold tracking-wide">
            Online Match
          </span>
        </div>

        {/* Tab switcher */}
        {!waiting && (
          <div className="flex rounded-xl glass p-1">
            <TabBtn active={tab === "create"} onClick={() => { setTab("create"); setError(""); }}>
              Create Room
            </TabBtn>
            <TabBtn active={tab === "join"} onClick={() => { setTab("join"); setError(""); }}>
              Join Room
            </TabBtn>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Waiting for guest ── */}
          {waiting && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-sm text-ice-frost/70">Share this code with your opponent:</p>
              <div className="flex items-center gap-3 rounded-xl bg-void-700/60 px-4 py-3">
                <span className="font-mono text-2xl font-bold tracking-[0.3em] text-ice">
                  {createdCode}
                </span>
                <button onClick={copyCode} className="ml-auto text-ice-frost/50 hover:text-ice transition">
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-ice-frost/50 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for opponent to join…
              </div>
            </motion.div>
          )}

          {/* ── Create tab ── */}
          {!waiting && tab === "create" && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <p className="text-sm text-ice-frost/60">
                You'll play as <span className="text-ice font-semibold">White</span>. Share the code with a friend.
              </p>
              <button
                onClick={handleCreate}
                disabled={loading || !address}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ice/90 px-5 py-3 font-display font-semibold tracking-wide text-void-900 shadow-ice-lg hover:bg-ice disabled:opacity-40 transition"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Create Room
              </button>
            </motion.div>
          )}

          {/* ── Join tab ── */}
          {!waiting && tab === "join" && (
            <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <p className="text-sm text-ice-frost/60">
                You'll play as <span className="text-ice font-semibold">Black</span>. Enter the 6-char code.
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="XXXXXX"
                className="w-full rounded-xl bg-void-700/60 border border-ice/15 px-4 py-3 font-mono text-xl tracking-[0.3em] text-ice placeholder:text-ice-frost/20 outline-none focus:border-ice/50 transition text-center"
              />
              <button
                onClick={handleJoin}
                disabled={loading || !address || code.length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ice/90 px-5 py-3 font-display font-semibold tracking-wide text-void-900 shadow-ice-lg hover:bg-ice disabled:opacity-40 transition"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Join Game
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {!address && (
          <p className="text-xs text-ice-frost/40 text-center">Connect your Sui wallet to play online</p>
        )}
      </div>
    </motion.div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 font-display text-sm tracking-wide transition ${
        active ? "bg-ice/90 text-void-900 shadow-ice" : "text-ice-frost/70 hover:text-ice"
      }`}
    >
      {children}
    </button>
  );
}
