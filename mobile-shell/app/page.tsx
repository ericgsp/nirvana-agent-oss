"use client";

import { useEffect } from "react";
import { API_BASE } from "./api-base";
import { toLocalPath } from "./local-nav";

// Capacitor's native shell always loads index.html (this route) as the
// app's entry point. This is the actual app entry: check the session once,
// then route to /agent or /login -- the same decision app/agent/page.tsx
// makes on its own load, just done here first since this is where the app
// actually starts.
export default function RootEntry() {
  useEffect(() => {
    fetch(`${API_BASE}/api/agent/session`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        window.location.href = toLocalPath(
          data.valid
            ? "/agent"
            : (data.redirectReason ? `/login?reason=${data.redirectReason}` : "/login")
        );
      })
      .catch(() => {
        window.location.href = toLocalPath("/login");
      });
  }, []);

  return null;
}
