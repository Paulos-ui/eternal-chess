export const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK ||
  "mainnet") as "mainnet" | "testnet" | "devnet";

export const PACKAGE_ID =
  process.env.NEXT_PUBLIC_PACKAGE_ID || "0x0";

export const MODULE = "eternal_chess";
export const ETERNAL_GAME_TYPE = `${PACKAGE_ID}::${MODULE}::EternalGame`;

// Public Walrus aggregator (reads are free + CORS friendly).
export const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR ||
  "https://aggregator.walrus-testnet.walrus.space";

// Build a public, content-addressed URL for any Walrus blob.
export const blobUrl = (blobId: string) =>
  `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;

// Block explorer links (SuiVision) for the demo / share buttons.
export const explorerObject = (id: string) =>
  `https://${SUI_NETWORK === "mainnet" ? "" : SUI_NETWORK + "."}suivision.xyz/object/${id}`;

export const explorerTx = (digest: string) =>
  `https://${SUI_NETWORK === "mainnet" ? "" : SUI_NETWORK + "."}suivision.xyz/txblock/${digest}`;
