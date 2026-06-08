"use client";

import { motion } from "framer-motion";

const TROPHIES = [
  { emoji: "🥉", label: "Bronze",    color: "#d97706", condition: "≥ 25 moves",           glow: "rgba(217,119,6,0.3)" },
  { emoji: "🥈", label: "Silver",    color: "#94a3b8", condition: "Checkmate ≥ 50 moves",  glow: "rgba(148,163,184,0.3)" },
  { emoji: "🥇", label: "Gold",      color: "#eab308", condition: "≥ 80 moves · Hard/Human",glow: "rgba(234,179,8,0.35)" },
  { emoji: "💎", label: "Diamond",   color: "#67e8f9", condition: "vs Human ≥ 60 moves",   glow: "rgba(103,232,249,0.4)" },
  { emoji: "👑", label: "Legendary", color: "#fde68a", condition: "vs Human ≥ 100 moves",  glow: "rgba(253,230,138,0.4)" },
  { emoji: "🎖️", label: "Emeritus",  color: "#c084fc", condition: "vs Human ≥ 150 moves",  glow: "rgba(192,132,252,0.4)" },
];

export function TrophyShowcase() {
  return (
    <section className="mx-auto mt-24 max-w-4xl px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <p className="font-display text-xs uppercase tracking-[0.4em] text-ice/60 mb-3">
          Earn your place in eternity
        </p>
        <h2 className="font-display text-3xl font-bold text-ice-frost text-glow">
          Six tiers. One path.
        </h2>
        <p className="mt-3 text-sm text-ice-frost/60 max-w-md mx-auto">
          Scarcity earned through skill — not randomness. Every tier is harder than the last.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TROPHIES.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -4 }}
            className="glass rounded-2xl p-4 flex flex-col items-center gap-2 text-center cursor-default transition-all"
            style={{ boxShadow: `0 0 0 1px ${t.glow}, 0 8px 32px -8px ${t.glow}` }}
          >
            <span className="text-3xl leading-none">{t.emoji}</span>
            <span
              className="font-display text-sm font-semibold tracking-wide"
              style={{ color: t.color }}
            >
              {t.label}
            </span>
            <span className="text-xs text-ice-frost/50 leading-relaxed">
              {t.condition}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
