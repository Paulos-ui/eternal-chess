"use client";

import { useState } from "react";
import { Mail, Github, ExternalLink, Send, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const TECH = [
  { label: "Sui", href: "https://sui.io" },
  { label: "Walrus", href: "https://walrus.xyz" },
  { label: "Tatum", href: "https://tatum.io" },
  { label: "Pusher", href: "https://pusher.com" },
  { label: "Next.js", href: "https://nextjs.org" },
];

const LINKS = [
  { label: "Play", href: "/" },
  { label: "GitHub", href: "https://github.com/Paulos-ui/eternal-chess", external: true },
  { label: "Medium article", href: "https://medium.com/@jayepaul81/i-built-a-chess-game-where-every-win-lives-forever-on-the-blockchain-heres-how-1b22ea69cb65", external: true },
  { label: "Demo video", href: "https://www.loom.com/share/57546db747a441869efcbcfadd02f6ab", external: true },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setSent(true);
    setLoading(false);
  }

  return (
    <footer className="relative mt-28 border-t border-ice/10">
      <div className="mx-auto max-w-6xl px-5 py-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">

        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">♟</span>
            <span className="font-display text-lg font-bold text-ice-frost tracking-wide">
              Eternal Chess
            </span>
          </div>
          <p className="text-sm text-ice-frost/50 leading-relaxed">
            Play. Eternalize. Own history forever. Every win minted as a Sui NFT, stored on Walrus — no servers, no takedowns.
          </p>
          <div className="flex gap-3 mt-5">
            <a
              href="https://github.com/Paulos-ui/eternal-chess"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-ice-frost/50 hover:text-ice transition"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <a
              href="https://x.com/__Official__1"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-ice-frost/50 hover:text-ice transition"
            >
              <ExternalLink className="h-4 w-4" /> @Jayking
            </a>
          </div>
        </div>

        {/* Links */}
        <div>
          <h4 className="font-display text-xs uppercase tracking-[0.3em] text-ice/60 mb-4">
            Links
          </h4>
          <ul className="space-y-2.5">
            {LINKS.map((l) => (
              <li key={l.label}>
                {l.external ? (
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-ice-frost/60 hover:text-ice transition flex items-center gap-1"
                  >
                    {l.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Link href={l.href} className="text-sm text-ice-frost/60 hover:text-ice transition">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Built with */}
        <div>
          <h4 className="font-display text-xs uppercase tracking-[0.3em] text-ice/60 mb-4">
            Built with
          </h4>
          <div className="flex flex-wrap gap-2">
            {TECH.map((t) => (
              <a
                key={t.label}
                href={t.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-2.5 py-1 text-xs font-display tracking-wide text-ice-frost/60 hover:text-ice transition"
                style={{ border: "1px solid rgba(34,211,238,0.15)" }}
              >
                {t.label}
              </a>
            ))}
          </div>

          <div className="mt-6 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-ice-frost/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Sui testnet · live
            </div>
            <div className="flex items-center gap-2 text-xs text-ice-frost/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Walrus testnet · live
            </div>
          </div>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-display text-xs uppercase tracking-[0.3em] text-ice/60 mb-4">
            Support
          </h4>
          <p className="text-sm text-ice-frost/50 mb-4 leading-relaxed">
            Bug reports, questions, or just want to send us your Legendary game?
          </p>

          <a
            href="mailto:Mymailjaypaul@gmail.com"
            className="flex items-center gap-2 text-sm text-ice hover:underline mb-5"
          >
            <Mail className="h-4 w-4" />
            Mymailjaypaul@gmail.com
          </a>

          {/* Quick contact form */}
          {!sent ? (
            <form onSubmit={handleSupport} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-xl px-3 py-2 text-sm bg-void-700/50 border border-ice/15 text-ice-frost placeholder:text-ice-frost/25 outline-none focus:border-ice/40 transition"
              />
              <textarea
                rows={2}
                placeholder="Your message…"
                className="w-full rounded-xl px-3 py-2 text-sm bg-void-700/50 border border-ice/15 text-ice-frost placeholder:text-ice-frost/25 outline-none focus:border-ice/40 transition resize-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ice/90 px-4 py-2 font-display text-sm font-semibold text-void-900 hover:bg-ice disabled:opacity-50 transition"
              >
                {loading ? "Sending…" : <><Send className="h-3.5 w-3.5" /> Send message</>}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-ice/20 px-4 py-3 text-sm text-ice">
              <CheckCircle2 className="h-4 w-4" />
              Message received — we'll reply soon.
            </div>
          )}
        </div>

      </div>

      {/* Bottom bar */}
      <div className="border-t border-ice/10 py-4 px-5">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3 text-xs text-ice-frost/30">
          <span>© 2025 Eternal Chess · Built by Jayking</span>
          <span className="font-mono">Tatum × Walrus Hackathon Entry</span>
        </div>
      </div>
    </footer>
  );
}
