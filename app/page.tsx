"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ChessGame } from "@/components/ChessGame";
import { Particles } from "@/components/ui/Particles";
import { ChessBackground } from "@/components/ui/ChessBackground";
import { LiveTicker } from "@/components/ui/LiveTicker";
import { TrophyShowcase } from "@/components/ui/TrophyShowcase";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { Footer } from "@/components/Footer";
import { Database, ShieldCheck, Infinity as InfinityIcon, Wifi } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Animated floating chess pieces background */}
      <ChessBackground />

      <Nav />
      <Particles />

      {/* Live mint ticker */}
      <div className="relative z-10 mt-[72px]">
        <LiveTicker />
      </div>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-10 pt-14">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12 } },
          }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={fade}
            className="font-display text-xs uppercase tracking-[0.4em] text-ice/70"
          >
            Sui × Walrus × Tatum
          </motion.p>

          <motion.h1
            variants={fade}
            className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-ice-frost text-glow sm:text-6xl"
          >
            Play. Eternalize.
            <br />
            Own History Forever.
          </motion.h1>

          <motion.p
            variants={fade}
            className="mx-auto mt-5 max-w-xl text-base text-ice-frost/70"
          >
            Every finished game becomes a permanent, verifiable Sui object whose
            full replay — board, moves, and PGN — lives forever as decentralized
            Walrus blobs. No servers. No takedowns. Just eternity.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={fade} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#game"
              className="flex items-center gap-2 rounded-xl bg-ice/90 px-6 py-3 font-display font-semibold tracking-wide text-void-900 shadow-ice-lg hover:bg-ice transition"
            >
              ♟ Play now
            </a>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-xl glass px-6 py-3 font-display text-sm tracking-wide text-ice-frost/80 hover:text-ice transition"
            >
              How it works
            </a>
          </motion.div>

          {/* Live counter badges */}
          <motion.div variants={fade} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "Games minted", value: "—" },
              { label: "Legendary NFTs", value: "—" },
              { label: "Online matches", value: "—" },
            ].map((s) => (
              <div
                key={s.label}
                className="glass rounded-xl px-4 py-2 text-center"
              >
                <div className="font-display text-lg font-bold text-ice">{s.value}</div>
                <div className="text-xs text-ice-frost/50 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Game board */}
        <motion.div
          id="game"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-14 scroll-mt-24"
        >
          <ChessGame />
        </motion.div>

        {/* Feature pills */}
        <div className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3">
          <Feature icon={Database} title="Stored on Walrus">
            PGN, final board, and full move JSON are written as content-addressed
            blobs — the NFT image literally points at a Walrus blob.
          </Feature>
          <Feature icon={ShieldCheck} title="Proven on Sui">
            Each game mints an on-chain object via Tatum&apos;s Sui RPC, binding
            your blobs to a verifiable, ownable record.
          </Feature>
          <Feature icon={Wifi} title="Play online">
            Challenge a real opponent anywhere with a 6-character room code.
            Real-time moves, server-validated, no cheating possible.{" "}
            <Link href="#game" className="text-ice hover:underline">
              Try it →
            </Link>
          </Feature>
        </div>
      </section>

      {/* Trophy showcase */}
      <div className="relative z-10">
        <TrophyShowcase />
      </div>

      {/* How it works */}
      <div id="how-it-works" className="relative z-10 scroll-mt-20">
        <HowItWorks />
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <Icon className="h-6 w-6 text-ice" />
      <h3 className="mt-3 font-display text-lg tracking-wide text-ice-frost">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ice-frost/65">{children}</p>
    </div>
  );
}
