import { SuiClient, SuiHTTPTransport } from "@mysten/sui/client";

/**
 * Browser SuiClient. It does NOT talk to Tatum directly — that would leak the
 * API key. Instead it points at our own `/api/rpc` route, which forwards every
 * JSON-RPC call to Tatum's Sui gateway with the secret key attached server-side.
 */
export function makeSuiClient(): SuiClient {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return new SuiClient({
    transport: new SuiHTTPTransport({ url: `${origin}/api/rpc` }),
  });
}
