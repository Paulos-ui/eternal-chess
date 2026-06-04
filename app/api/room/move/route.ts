/**
 * app/api/room/move/route.ts
 *
 * POST body: { code: string; from: string; to: string; promotion?: string; playerAddress: string }
 * Returns:   { fen: string; pgn: string; gameOver?: boolean; result?: string; winner?: string }
 *
 * Validates it's the right player's turn, applies the move to the server-side
 * Chess instance, persists the new state, and broadcasts via Pusher.
 */

import { NextRequest, NextResponse } from "next/server";
import { Chess } from "chess.js";
import { redisGet, redisSet, pusherTrigger } from "@/lib/realtime";
import { roomChannel, type RoomState, type PusherEvent } from "@/lib/room";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { code, from, to, promotion = "q", playerAddress } = await req.json();
    if (!code || !from || !to || !playerAddress) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const key = `room:${code.toUpperCase()}`;
    const raw = await redisGet(key);
    if (!raw) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const room: RoomState = JSON.parse(raw);

    if (room.status !== "playing") {
      return NextResponse.json({ error: "Game is not in progress" }, { status: 409 });
    }

    // Reconstruct board state from PGN (most reliable for chess.js).
    const chess = new Chess();
    if (room.pgn) chess.loadPgn(room.pgn);

    // Verify it's this player's turn.
    const isWhiteTurn = chess.turn() === "w";
    const isHost = playerAddress === room.hostAddress;   // host = white
    const isGuest = playerAddress === room.guestAddress; // guest = black

    if ((isWhiteTurn && !isHost) || (!isWhiteTurn && !isGuest)) {
      return NextResponse.json({ error: "Not your turn" }, { status: 403 });
    }

    // Apply move.
    let move;
    try {
      move = chess.move({ from, to, promotion });
    } catch {
      return NextResponse.json({ error: "Illegal move" }, { status: 400 });
    }

    room.fen = chess.fen();
    room.pgn = chess.pgn();

    let gameOver = false;
    let result: string | null = null;
    let winner: string | null = null;
    let resultLabel = "";

    if (chess.isGameOver()) {
      gameOver = true;
      room.status = "finished";

      if (chess.isCheckmate()) {
        const whiteWon = chess.turn() === "b";
        result = whiteWon ? "1-0" : "0-1";
        resultLabel = whiteWon ? "White wins by checkmate" : "Black wins by checkmate";
        winner = whiteWon ? room.hostAddress : (room.guestAddress ?? "black");
      } else {
        result = "1/2-1/2";
        if (chess.isStalemate()) resultLabel = "Draw — stalemate";
        else if (chess.isThreefoldRepetition()) resultLabel = "Draw — threefold repetition";
        else if (chess.isInsufficientMaterial()) resultLabel = "Draw — insufficient material";
        else resultLabel = "Draw";
        winner = "draw";
      }

      room.result = result;
      room.winner = winner;
    }

    await redisSet(key, JSON.stringify(room), 3600);

    // Broadcast to both clients.
    if (gameOver) {
      const event: PusherEvent = { type: "game_over", result: result!, winner: winner!, resultLabel };
      await pusherTrigger(roomChannel(code.toUpperCase()), "game_over", event);
    } else {
      const event: PusherEvent = { type: "move_made", fen: room.fen, pgn: room.pgn, san: move.san };
      await pusherTrigger(roomChannel(code.toUpperCase()), "move_made", event);
    }

    return NextResponse.json({ fen: room.fen, pgn: room.pgn, gameOver, result, winner, resultLabel });
  } catch (e) {
    console.error("[room/move]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
