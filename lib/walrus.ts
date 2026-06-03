import type { WalrusUploadResult } from "./types";

/**
 * The ONE place Eternal Chess writes to Walrus.
 *
 * It posts a file to our own `/api/walrus` route, which forwards the bytes to a
 * Walrus publisher (PUT /v1/blobs). This is intentionally isolated: if you later
 * switch to Tatum's Walrus tutorial endpoint, the Mysten `@mysten/walrus` SDK,
 * or a hosted publisher, you only edit this function + the server route.
 *
 * Reads happen elsewhere, straight from the public aggregator (see lib/constants).
 */
export async function uploadToWalrus(
  file: Blob,
  filename: string,
  sendObjectTo?: string,
): Promise<WalrusUploadResult> {
  const form = new FormData();
  form.append("file", file, filename);
  if (sendObjectTo) form.append("sendObjectTo", sendObjectTo);

  const res = await fetch("/api/walrus", { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Walrus upload failed (${res.status}): ${text}`);
  }
  return (await res.json()) as WalrusUploadResult;
}

export function jsonBlob(data: unknown): Blob {
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}

export function textBlob(text: string): Blob {
  return new Blob([text], { type: "text/plain" });
}
