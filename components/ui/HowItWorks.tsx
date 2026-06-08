"use client";

import { motion } from "framer-motion";
import { Swords, Sparkles, Wallet, ExternalLink } from "lucide-react";

const STEPS = [
  {
    icon: Swords,
    number: "01",
    title: "Play a game",
    desc: "Challenge the AI, a friend in hot-seat, or a real opponent online via room code. Every move is validated on the server.",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Earn your trophy",
    desc: "Win with enough moves and your game qualifies for a tier, Bronze up to the near-impossible Emeritus. Scarcity is earned, never random.",
  },
  {
    icon: Wallet,
    number: "03",
    title: "Eternalize it",
    desc: "One click uploads your PGN, board snapshot, and move JSON to Walrus. The contract mints a Sui object sent directly to your wallet.",
  },
  {
    icon: ExternalLink,
    number: "04",
    title: "Own it forever",
    desc: "Your NFT is transferable, tradeable on Sui markets, and independently verifiable. The replay lives on Walrus no server required.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto mt-24 max-w-4xl px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <p className="font-display text-xs uppercase tracking-[0.4em] text-ice/60 mb-3">
          How it works
        </p>
        <h2 className="font-display text-3xl font-bold text-ice-frost text-glow">
          From move one to on-chain forever
        </h2>
      </motion.div>

      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-ice/10 hidden sm:block" />

        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass rounded-2xl p-5 flex gap-5 items-start"
            >
              <div className="relative flex-shrink-0">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.25)" }}
                >
                  <step.icon className="h-5 w-5 text-ice" />
                </div>
                <span
                  className="absolute -top-2 -right-2 font-display text-xs font-bold text-ice/40"
                  style={{ fontSize: "10px", letterSpacing: "0.05em" }}
                >
                  {step.number}
                </span>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-ice-frost tracking-wide">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-ice-frost/60 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
