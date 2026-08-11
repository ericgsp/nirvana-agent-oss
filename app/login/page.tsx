"use client";

import { useActionState, useState, useEffect, Suspense } from "react";
import { loginAction } from "@/app/actions/auth";
import { useSearchParams } from "next/navigation";
import { Device } from "@capacitor/device";

function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const searchParams = useSearchParams();
  const sessionReplaced = searchParams.get("reason") === "session_replaced";
  const deviceBound = searchParams.get("reason") === "device_bound";

  useEffect(() => {
    const saved = localStorage.getItem("rememberedEmail");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
    // Prefer Capacitor's native device identifier (stored via the OS --
    // Keychain on iOS, not WebView localStorage) over the old localStorage
    // UUID: iOS can and does clear WebView localStorage under storage
    // pressure, which was silently generating a new "device" and locking
    // legitimate agents out of their own bound account. localStorage stays
    // as the fallback for plain web-browser access, where there's no
    // native identifier available.
    (async () => {
      try {
        const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
        if (w.Capacitor?.isNativePlatform?.()) {
          const info = await Device.getId();
          if (info.identifier) {
            setDeviceId(info.identifier);
            return;
          }
        }
      } catch {
        // fall through to localStorage fallback below
      }
      let id = localStorage.getItem("device_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("device_id", id);
      }
      setDeviceId(id);
    })();
  }, []);

  useEffect(() => {
    if (state?.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state?.redirectTo]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const emailVal = (form.elements.namedItem("email") as HTMLInputElement).value;
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", emailVal);
    } else {
      localStorage.removeItem("rememberedEmail");
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "40px 36px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
          BDD1228 Agent Assistance
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Sign in to continue
        </p>
      </div>

      <form action={action} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <input type="hidden" name="device_id" value={deviceId} />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="email" style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
            Email
          </label>
          <input
            id="email" name="email" type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)}
            style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "9px 12px", fontSize: "14px", color: "#0f172a", outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="password" style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
            Password
          </label>
          <input
            id="password" name="password" type="password" autoComplete="current-password" required
            style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "9px 12px", fontSize: "14px", color: "#0f172a", outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#0f172a" }}
          />
          <span style={{ fontSize: "13px", color: "#374151" }}>Remember me</span>
        </label>

        {sessionReplaced && (
          <p style={{ margin: 0, fontSize: "13px", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px" }}>
            You were signed out because your account was logged in on another device.
          </p>
        )}

        {deviceBound && (
          <p style={{ margin: 0, fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "8px 12px" }}>
            This account is bound to another device. Contact your administrator to reset access.
          </p>
        )}

        {state?.error && (
          <p style={{ margin: 0, fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "8px 12px" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit" disabled={pending}
          style={{ background: pending ? "#94a3b8" : "#0f172a", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 16px", fontSize: "14px", fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", marginTop: "4px", width: "100%" }}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ margin: "20px 0 0", fontSize: "13px", color: "#64748b", textAlign: "center" }}>
        Contact your administrator to request access.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "24px",
      }}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
