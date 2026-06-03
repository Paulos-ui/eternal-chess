import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLISHER =
  process.env.WALRUS_PUBLISHER ||
  "https://publisher.walrus-testnet.walrus.space";
const EPOCHS = process.env.WALRUS_EPOCHS || "5";

/**
 * Writes a blob to Walrus via a publisher.
 *
 * Walrus publisher API:  PUT {publisher}/v1/blobs?epochs=N[&send_object_to=ADDR]
 * Body = raw file bytes. Response is JSON describing either a `newlyCreated`
 * blob or one that was `alreadyCertified` (content-addressed dedupe).
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const sendObjectTo = form.get("sendObjectTo")?.toString();

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const params = new URLSearchParams({ epochs: EPOCHS });
  if (sendObjectTo) params.set("send_object_to", sendObjectTo);

  const url = `${PUBLISHER}/v1/blobs?${params.toString()}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const upstream = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: bytes,
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Publisher ${upstream.status}: ${text}` },
      { status: 502 },
    );
  }

  const raw = await upstream.json();

  // Normalise the two possible shapes into one result.
  const newly = raw?.newlyCreated?.blobObject;
  const already = raw?.alreadyCertified;

  const result = {
    blobId: newly?.blobId ?? already?.blobId ?? null,
    objectId: newly?.id ?? null,
    endEpoch:
      newly?.storage?.endEpoch ?? already?.endEpoch ?? null,
    alreadyCertified: Boolean(already),
  };

  if (!result.blobId) {
    return NextResponse.json(
      { error: "Could not parse blobId from publisher", raw },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}
