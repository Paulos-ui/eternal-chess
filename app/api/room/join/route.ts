/**
 * app/api/room/join/route.ts
 *
 * POST body: { code: string; guestAddress: string }
 * Returns:   { room: RoomState }
 *
 * Validates the code, assigns the guest, flips room status to "playing",
 * and fires a Pusher event so the host knows their opponent joined.
 */

import { NextRequest, NextResponse } from "next/server";
import { redisGet, redisSet, pusherTrigger } from "@/lib/realtime";
import { roomChannel, type RoomState, type PusherEvent } from "@/lib/room";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { code, guestAddress } = await req.json();
    if (!code || !guestAddress) {
      return NextResponse.json({ error: "code and guestAddress required" }, { status: 400 });
    }

    const raw = await redisGet(`room:${code.toUpperCase()}`);
    if (!raw) {
      return NextResponse.json({ error: "Room not found or expired" }, { status: 404 });
    }

    const room: RoomState = JSON.parse(raw);

    if (room.status !== "waiting") {
      return NextResponse.json({ error: "Room is already full or finished" }, { status: 409 });
    }

    if (room.hostAddress === guestAddress) {
      return NextResponse.json({ error: "You cannot join your own room" }, { status: 409 });
    }

    room.guestAddress = guestAddress;
    room.status = "playing";

    await redisSet(`room:${code.toUpperCase()}`, JSON.stringify(room), 3600);

    const event: PusherEvent = { type: "room_joined", guestAddress };
    await pusherTrigger(roomChannel(code.toUpperCase()), "room_joined", event);

    return NextResponse.json({ room });
  } catch (e) {
    console.error("[room/join]", e);
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
