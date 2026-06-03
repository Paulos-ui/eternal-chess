import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TATUM_RPC =
  process.env.TATUM_SUI_RPC || "https://sui-mainnet.gateway.tatum.io";
const TATUM_KEY = process.env.TATUM_API_KEY || "";

/**
 * Transparent JSON-RPC proxy to Tatum's Sui gateway.
 * The browser's SuiClient sends standard JSON-RPC here; we forward it to Tatum
 * with the secret `x-api-key` header. The key never reaches the client.
 */
export async function POST(req: NextRequest) {
  if (!TATUM_KEY) {
    return NextResponse.json(
      { error: "TATUM_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  const body = await req.text();

  const upstream = await fetch(TATUM_RPC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TATUM_KEY,
    },
    body,
  });

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
