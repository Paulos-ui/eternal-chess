/**
 * app/api/room/create/route.ts
 *
 * POST body: { hostAddress: string }
 * Returns:   { code: string }
 *
 * Creates a new room, stores its state in Upstash Redis (TTL 1 hour),
 * and returns the 6-char code the host shares with their opponent.
 */

import { NextRequest, NextResponse } from "next/server";
import { Chess } from "chess.js";
import { pusherTrigger, redisSet } from "@/lib/realtime";
import { generateCode, type RoomState } from "@/lib/room";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { hostAddress } = await req.json();
    if (!hostAddress) {
      return NextResponse.json({ error: "hostAddress required" }, { status: 400 });
    }

    const code = generateCode();
    const chess = new Chess();

    const room: RoomState = {
      code,
      hostAddress,
      guestAddress: null,
      hostColor: "white",
      fen: chess.fen(),
      pgn: "",
      status: "waiting",
      createdAt: Date.now(),
      winner: null,
      result: null,
    };

    await redisSet(`room:${code}`, JSON.stringify(room), 3600);

    return NextResponse.json({ code });
  } catch (e) {
    console.error("[room/create]", e);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
