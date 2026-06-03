import type { Metadata } from "next";
import { Chakra_Petch, Sora } from "next/font/google";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";
import { Providers } from "./providers";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});
const body = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Eternal Chess — Play. Eternalize. Own History Forever.",
  description:
    "Every finished game becomes a permanent, verifiable Sui object whose replay lives forever on Walrus decentralized storage. Powered by Tatum.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="cosmic-bg" />
        <div className="cosmic-grid" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
