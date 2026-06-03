export type GameResult = "white" | "black" | "draw";

export interface EternalGameFields {
  player: string;
  white: string;
  black: string;
  result: string; // "1-0" | "0-1" | "1/2-1/2"
  winner: string; // address or "draw"
  move_count: string;
  played_at: string;
  pgn_blob_id: string;
  board_blob_id: string;
  moves_blob_id: string;
  image_url: string;
}

export interface EternalGame extends EternalGameFields {
  objectId: string;
}

export interface WalrusUploadResult {
  blobId: string;
  objectId: string | null;
  endEpoch: number | null;
  alreadyCertified: boolean;
}

export interface EternalizePayload {
  white: string;
  black: string;
  result: string;
  winner: string;
  moveCount: number;
  playedAt: number;
  pgnBlobId: string;
  boardBlobId: string;
  movesBlobId: string;
  imageUrl: string;
}
