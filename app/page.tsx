"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ChessGame } from "@/components/ChessGame";
import { Particles } from "@/components/ui/Particles";
import { Database, ShieldCheck, Infinity as InfinityIcon } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Nav />
      <Particles />

      <section className="mx-auto max-w-6xl px-5 pb-24 pt-10">
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-12"
        >
          <ChessGame />
        </motion.div>

        <div className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3">
          <Feature icon={Database} title="Stored on Walrus">
            PGN, final board, and full move JSON are written as content-addressed
            blobs — the NFT image literally points at a Walrus blob.
          </Feature>
          <Feature icon={ShieldCheck} title="Proven on Sui">
            Each game mints an on-chain object via Tatum&apos;s Sui RPC, binding
            your blobs to a verifiable, ownable record.
          </Feature>
          <Feature icon={InfinityIcon} title="Yours forever">
            Anyone can independently re-fetch and replay the game straight from
            the decentralized network. <Link href="/dashboard" className="text-ice hover:underline">See your archive →</Link>
          </Feature>
        </div>
      </section>
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
