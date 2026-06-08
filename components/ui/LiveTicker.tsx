"use client";

import { useEffect, useRef, useState } from "react";

const MOCK_EVENTS = [
  { trophy: "👑", label: "Legendary", addr: "0x3f8a…c21d", moves: 104 },
  { trophy: "💎", label: "Diamond", addr: "0xa17b…9e0f", moves: 73 },
  { trophy: "🥇", label: "Gold", addr: "0x55cc…3310", moves: 82 },
  { trophy: "🥈", label: "Silver", addr: "0x9d4e…77aa", moves: 54 },
  { trophy: "🥉", label: "Bronze", addr: "0x12fb…44d1", moves: 27 },
  { trophy: "🎖️", label: "Emeritus", addr: "0x7711…ee29", moves: 157 },
  { trophy: "💎", label: "Diamond", addr: "0xc90a…b83c", moves: 61 },
  { trophy: "🥇", label: "Gold", addr: "0x2245…af77", moves: 91 },
];

export function LiveTicker() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full overflow-hidden border-y border-ice/10 py-2.5" aria-label="Live mint feed">
      <div className="flex items-center gap-2 absolute left-0 top-0 bottom-0 z-10 pl-3 pr-6"
        style={{ background: "linear-gradient(90deg, #05070f 60%, transparent)" }}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-display text-xs tracking-widest text-ice-frost/50 uppercase">Live mints</span>
      </div>

      <div
        ref={trackRef}
        className="flex gap-8 pl-40 animate-ticker whitespace-nowrap"
        style={{ willChange: "transform" }}
      >
        {[...MOCK_EVENTS, ...MOCK_EVENTS].map((e, i) => (
          <span key={i} className="inline-flex items-center gap-2 font-display text-xs text-ice-frost/60">
            <span>{e.trophy}</span>
            <span className="text-ice font-semibold">{e.label}</span>
            <span className="text-ice-frost/40">·</span>
            <span className="font-mono">{e.addr}</span>
            <span className="text-ice-frost/40">·</span>
            <span>{e.moves} moves</span>
          </span>
        ))}
      </div>
    </div>
  );
}
