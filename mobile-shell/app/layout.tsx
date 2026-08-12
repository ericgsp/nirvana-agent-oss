import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Agent Assist",
  manifest: "/agent-manifest.json",
  appleWebApp: {
    capable: true,
    title: "Sales Agent Assist",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={{ background: "#075E54", overscrollBehavior: "none", height: "100dvh" }}
      suppressHydrationWarning
    >
      {/* Capacitor's native bridge injects scripts/attributes into html/body
          before React hydrates, which don't match the server-rendered markup
          -- see the matching note in the main app's layout.tsx. */}
      <body style={{ overscrollBehavior: "none", height: "100dvh", margin: 0 }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
