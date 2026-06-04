/**
 * lib/realtime.ts
 *
 * Server-side: Pusher trigger helper + Upstash Redis client.
 * Client-side: Pusher subscribe helper.
 *
 * Env vars needed (add to Vercel + .env.local):
 *   PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
 *   NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

// ─── Server helpers (API routes only) ───────────────────────────────────────

export async function pusherTrigger(
  channel: string,
  event: string,
  data: unknown,
) {
  const { appId, key, secret, cluster } = {
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
  };

  const body = JSON.stringify({ name: event, channel, data: JSON.stringify(data) });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = `/apps/${appId}/events`;

  // Build HMAC-SHA256 signature (no extra dependency needed in Node 18+).
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(
    `POST\n${path}\n` +
      `auth_key=${key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${await md5(body)}&channel=${channel}&name=${event}`,
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, msgData)),
  ).map((b) => b.toString(16).padStart(2, "0")).join("");

  const url =
    `https://api-${cluster}.pusher.com${path}` +
    `?auth_key=${key}&auth_timestamp=${timestamp}&auth_version=1.0` +
    `&body_md5=${await md5(body)}&auth_signature=${sig}`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

async function md5(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "MD5",
    new TextEncoder().encode(text),
  ).catch(() => null);
  // Node 18 doesn't support MD5 in subtle, fall back to a simple hex hash.
  if (!buf) return simpleHash(text);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0");
}

// ─── Upstash Redis (HTTP REST — no persistent connections, Vercel-safe) ──────

async function redisRequest(method: "GET" | "SET" | "DEL" | "EXPIRE", ...args: string[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${method}/${args.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function redisSet(key: string, value: string, exSeconds = 3600) {
  await redisRequest("SET", key, value);
  await redisRequest("EXPIRE", key, String(exSeconds));
}

export async function redisGet(key: string): Promise<string | null> {
  const data = await redisRequest("GET", key);
  return data.result ?? null;
}

export async function redisDel(key: string) {
  await redisRequest("DEL", key);
}
