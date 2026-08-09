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
    >
      <body className="flex flex-col" style={{ overscrollBehavior: "none", height: "100dvh" }}>{children}</body>
    </html>
  );
}
