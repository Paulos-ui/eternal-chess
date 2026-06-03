"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Nav } from "@/components/Nav";
import { GameCard } from "@/components/GameCard";
import { ReplayViewer } from "@/components/ReplayViewer";
import { Particles } from "@/components/ui/Particles";
import { ETERNAL_GAME_TYPE, PACKAGE_ID } from "@/lib/constants";
import type { EternalGame, EternalGameFields } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const account = useCurrentAccount();
  const [replay, setReplay] = useState<EternalGame | null>(null);

  const enabled = !!account && PACKAGE_ID !== "0x0";

  const { data, isPending, error } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address ?? "",
      filter: { StructType: ETERNAL_GAME_TYPE },
      options: { showContent: true },
    },
    { enabled },
  );

  const games: EternalGame[] =
    data?.data
      ?.map((o) => {
        const content = o.data?.content;
        if (!content || content.dataType !== "moveObject") return null;
        const f = content.fields as unknown as EternalGameFields;
        return { objectId: o.data!.objectId, ...f };
      })
      .filter((g): g is EternalGame => g !== null) ?? [];

  return (
    <main className="relative min-h-screen">
      <Nav />
      <Particles count={16} />

      <section className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ice-frost text-glow sm:text-4xl">
          The Eternal Archive
        </h1>
        <p className="mt-2 max-w-xl text-ice-frost/65">
          Your eternalized games, fetched live from Sui via Tatum and replayed
          straight from Walrus.
        </p>

        {!account && (
          <p className="mt-10 rounded-xl glass p-6 text-ice-frost/70">
            Connect your wallet to see your eternalized games.
          </p>
        )}

        {account && PACKAGE_ID === "0x0" && (
          <p className="mt-10 rounded-xl glass p-6 text-amber-300">
            Set <code>NEXT_PUBLIC_PACKAGE_ID</code> to load your archive.
          </p>
        )}

        {enabled && isPending && (
          <div className="mt-16 flex justify-center text-ice">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        )}

        {error && (
          <p className="mt-10 rounded-xl bg-red-500/10 p-6 text-red-300">
            {String(error)}
          </p>
        )}

        {enabled && !isPending && games.length === 0 && (
          <p className="mt-10 rounded-xl glass p-6 text-ice-frost/70">
            No eternalized games yet. Go play one and freeze it forever.
          </p>
        )}

        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {games.map((g) => (
            <GameCard key={g.objectId} game={g} onReplay={() => setReplay(g)} />
          ))}
        </div>
      </section>

      {replay && <ReplayViewer game={replay} onClose={() => setReplay(null)} />}
    </main>
  );
}
