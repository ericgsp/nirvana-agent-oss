import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Supamobily",
  description: "BDD1228 Agent Assistance",
  // Agent page overrides this with its own themeColor via its own metadata export
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: "#075E54", overscrollBehavior: "none", height: "100dvh" }}
      suppressHydrationWarning
    >
      {/* Capacitor's native bridge injects scripts/attributes into html/body
          before React hydrates, which don't match the server-rendered markup --
          this was causing React error #418 (hydration mismatch), which makes
          React discard and rebuild the whole DOM tree, wiping out everything
          agent-app.js had already set up (looked like an infinite reload loop,
          but was actually React silently regenerating the tree each time). */}
      <body className="flex flex-col" style={{ overscrollBehavior: "none", height: "100dvh" }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
