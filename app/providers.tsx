"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit";
import { useState } from "react";
import { SUI_NETWORK } from "@/lib/constants";

// Every network points at our own proxy route, which forwards to Tatum with the
// secret API key. The frontend never sees the key.
const { networkConfig } = createNetworkConfig({
  mainnet: { url: "/api/rpc" },
  testnet: { url: "/api/rpc" },
  devnet: { url: "/api/rpc" },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={SUI_NETWORK}>
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
