import type { Metadata } from "next";
import { IBM_Plex_Sans, Syne } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/app/components/nav";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700"],
});

const displayFont = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700", "800"],
});

const TITLE = "Arcade Gate — Mini-game Lobby";
const DESCRIPTION = "Pick a game, sign in with your Szabee ID, and play instantly. Tactical barricade battles, leaderboards, and more in one multiplayer arcade.";
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://arcade-gate.vercel.app";

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: "%s | Arcade Gate",
  },
  description: DESCRIPTION,
  metadataBase: new URL(BASE),
  openGraph: {
    images: [{ url: `${BASE}/og-image.png` }],
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Arcade Gate",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable} bg-bg-night text-ink-1 font-body antialiased min-h-dvh`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
