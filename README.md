# ♟️❄️ Eternal Chess

**Play. Eternalize. Own History Forever — on Sui + Walrus, powered by Tatum.**

Eternal Chess is a fully on-chain chess archive. You play in the browser; when a
game ends, you "eternalize" it: the full **PGN**, a **final-board PNG**, and a
**move-by-move JSON** are written to **Walrus decentralized storage**, then a
single Sui transaction (routed through **Tatum's Sui RPC**) mints an ownable
`EternalGame` object whose NFT image *is* the Walrus blob. Anyone can later
re-fetch and replay the game straight from the decentralized network — no server,
no database, no takedowns.

---

## Why Walrus is core (not an add-on)

The hackathon requires Walrus to be load-bearing. In Eternal Chess, **the game
record does not exist anywhere else**:

- The replay, board image, and move log live **only** as Walrus blobs. There is
  no backend database.
- The on-chain `EternalGame` object stores **Walrus blob IDs**, and its Sui
  `Display` `image_url` resolves through a Walrus aggregator — so wallets and
  explorers render the NFT directly from Walrus.
- The dashboard reads games back by fetching those blobs live from Walrus.

Remove Walrus and there is no archive, no replay, and no NFT image. That is the
"core, not add-on" bar.

## How Tatum is used

- **Every** Sui JSON-RPC call goes through Tatum's gateway
  (`https://sui-mainnet.gateway.tatum.io`): the eternalize transaction,
  `getOwnedObjects` queries on the dashboard, transaction-effect lookups, and
  object reads.
- The Tatum API key is **never** shipped to the browser. A Next.js route
  (`/app/api/rpc`) proxies JSON-RPC to Tatum and injects the `x-api-key` header
  server-side. The frontend's `SuiClient` simply points at `/api/rpc`.

---

## Architecture

```
 Browser (Next.js / React)
 ├─ react-chessboard + chess.js ............ play (hot-seat or vs AI)
 ├─ html-to-image .......................... capture final board → PNG
 │
 ├─ POST /api/walrus  ──────────────▶ Walrus Publisher (PUT /v1/blobs)
 │      (PGN, board PNG, moves JSON)         └─ returns blobId + Sui Blob object
 │
 ├─ Transaction(eternalize)
 │      └─ signed by wallet, executed via ▶ POST /api/rpc ──▶ Tatum Sui RPC
 │                                                              └─ mints EternalGame
 │
 └─ Dashboard
        ├─ getOwnedObjects via ──────────▶ POST /api/rpc ──▶ Tatum Sui RPC
        └─ replay: GET blob ─────────────▶ Walrus Aggregator (/v1/blobs/:id)
```

The Move package (`move/eternal_chess`) defines the `EternalGame` object, sets up
its `Display`, and exposes one entry function, `eternalize(...)`, which records
the blob IDs + game metadata and transfers the object to the player.

---

## Project layout

```
app/
  api/rpc/route.ts        Tatum RPC proxy (keeps API key secret)
  api/walrus/route.ts     Walrus publisher upload proxy
  page.tsx                Landing + play
  dashboard/page.tsx      Owned-game archive
  providers.tsx           dapp-kit + react-query wiring (Sui client → /api/rpc)
components/
  ChessGame.tsx           Board, hot-seat/AI, game-over detection
  EternalizeModal.tsx     Capture → upload to Walrus → mint via Tatum
  ReplayViewer.tsx        Fetches PGN from Walrus and scrubs through moves
  GameCard.tsx, Nav.tsx, ui/Particles.tsx
lib/
  sui.ts                  SuiClient pointed at the proxy
  walrus.ts               THE single place blobs are written (swappable)
  chess-ai.ts             Tiny 1-ply opponent
  constants.ts, types.ts
move/eternal_chess/        Sui Move package
```

---

## Setup

### 0. Prerequisites
- Node 18+ and the [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install)
- A Sui wallet (e.g. Sui Wallet / Suiet) with some **SUI** for gas
- A **Tatum API key** from <https://dashboard.tatum.io/>

### 1. Install
```bash
npm install
cp .env.local.example .env.local   # then fill it in
```

### 2. Publish the Move package
```bash
cd move/eternal_chess
sui client publish --gas-budget 100000000
```
Copy the new **package ID** into `.env.local` as `NEXT_PUBLIC_PACKAGE_ID`.

### 3. Run
```bash
npm run dev      # http://localhost:3000
```

---

## Walrus on mainnet (important)

Reads (the aggregator) are free. **Writes cost WAL + SUI**, so there is **no free
public publisher on mainnet** — you must point `WALRUS_PUBLISHER` at a publisher
you control or one you've arranged access to.

**Recommended for development:** use Walrus **testnet** first (free public
publisher), confirm the whole loop, then switch the four Walrus/RPC env vars to
mainnet for submission.

**To run your own mainnet publisher** (one funded keypair):
```bash
# install walrus CLI per https://docs.wal.app, fund the wallet with SUI + WAL, then:
walrus publisher --context mainnet --bind-address 0.0.0.0:31415
# set WALRUS_PUBLISHER=http://<your-host>:31415
```
Because we pass `send_object_to=<player address>`, the Walrus `Blob` objects are
transferred to the player even when a shared publisher writes them.

> Swapping the write backend (e.g. to Tatum's Walrus endpoint or the
> `@mysten/walrus` SDK) only touches `lib/walrus.ts` + `app/api/walrus/route.ts`.

---

## Demo video script (~2.5 min)

1. **(0:00) Hook** — "Chess games vanish into a database. What if every game lived
   forever, ownable, on decentralized storage?" Show the hero.
2. **(0:20) Play** — Connect wallet (note: RPC runs through Tatum). Play a quick
   game vs the AI to checkmate.
3. **(0:55) Eternalize** — Click *Eternalize*. Narrate the three steps: capture →
   **upload to Walrus** → **mint on Sui via Tatum**. Approve in wallet.
4. **(1:35) Proof** — On the success screen, open the **Walrus blob** link (board
   renders from the aggregator) and the **SuiVision object** link (show blob IDs
   stored on-chain).
5. **(2:05) Archive** — Go to *My Archive*, open a card, scrub the replay —
   emphasize it's loading **live from Walrus**, not a server.
6. **(2:25) Close** — "Stored trustlessly on Walrus, proven on Sui, powered by
   Tatum." Mention the X share button.

---

## Judging fit

| Criterion (weight) | How Eternal Chess addresses it |
| --- | --- |
| Walrus + Tatum integration (30%) | Game data exists *only* as Walrus blobs; the NFT image resolves from Walrus; every Sui RPC call is routed through Tatum with a server-secured key. |
| Technical quality (30%) | Clean separation (proxy routes keep the key off the client), a real Move package with `Display`, typed end-to-end, single swappable Walrus module. |
| Creativity (20%) | A chess archive where finished games become ownable, replayable, decentralized assets. |
| Presentation (20%) | Distinctive ice/holographic UI, live on-chain dashboard, and a tight demo. |

## Troubleshooting

- **Blank board screenshot:** some piece sets load as cross-origin images and
  taint the canvas. The default react-chessboard set inlines its pieces; if you
  swap in a custom set, use inline/base64 pieces so `html-to-image` can capture.
- **`Publisher 4xx`:** on mainnet this almost always means the publisher isn't
  funded or you're using a testnet publisher URL. See the Walrus section above.
- **Empty dashboard:** confirm `NEXT_PUBLIC_PACKAGE_ID` matches the network your
  wallet is on, and that the eternalize transaction succeeded.

## Security note

Treat your Tatum key like a password. It belongs only in `.env.local` (gitignored)
and is used server-side. If a key is ever exposed, rotate it immediately in the
Tatum dashboard.
