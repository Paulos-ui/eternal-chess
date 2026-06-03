"use client";

import Link from "next/link";
import { ConnectButton } from "@mysten/dapp-kit";
import { Snowflake } from "lucide-react";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ice/10 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <Snowflake className="h-6 w-6 text-ice transition-transform group-hover:rotate-90" />
          <span className="font-display text-lg font-bold tracking-wider text-ice-frost text-glow">
            ETERNAL<span className="text-ice">CHESS</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/"
            className="hidden font-display text-sm tracking-wide text-ice-frost/70 hover:text-ice sm:block"
          >
            Play
          </Link>
          <Link
            href="/dashboard"
            className="hidden font-display text-sm tracking-wide text-ice-frost/70 hover:text-ice sm:block"
          >
            My Archive
          </Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
