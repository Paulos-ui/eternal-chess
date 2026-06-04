/**
 * lib/room.ts
 * Shared types for the online room/multiplayer system.
 */

export type RoomColor = "white" | "black";
export type RoomStatus = "waiting" | "playing" | "finished";

export interface RoomState {
  code: string;
  hostAddress: string;
  guestAddress: string | null;
  hostColor: RoomColor;       // host is always white
  fen: string;                // current board FEN
  pgn: string;                // full PGN so far
  status: RoomStatus;
  createdAt: number;
  winner: string | null;      // address, "draw", or null
  result: string | null;      // "1-0" | "0-1" | "1/2-1/2" | null
}

export type PusherEvent =
  | { type: "room_joined"; guestAddress: string }
  | { type: "move_made"; fen: string; pgn: string; san: string }
  | { type: "game_over"; result: string; winner: string; resultLabel: string };

/** Channel name from room code */
export const roomChannel = (code: string) => `game-${code}`;

/** Generate a 6-char uppercase room code */
export function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
