"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Entry = {
  id: number;
  attempted_at: string;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  blocked_reason: string | null;
};

type Row = {
  id: number;
  timestamp: string;
  email: string;
  action: string;
  ip: string;
  success: boolean;
  blockedReason: string | null;
  userAgent: string;
};

const BLOCKED_LABEL: Record<string, string> = {
  device_mismatch: "Blocked — wrong device",
  missing_device_id: "Blocked — no device ID",
};

function parseEntry(e: Entry): Row {
  const action = e.blocked_reason
    ? (BLOCKED_LABEL[e.blocked_reason] ?? `Blocked — ${e.blocked_reason}`)
    : e.success ? "Login" : "Login (failed)";
  return {
    id: e.id,
    timestamp: e.attempted_at,
    email: e.email || "—",
    action,
    ip: e.ip_address ?? "—",
    success: e.success,
    blockedReason: e.blocked_reason,
    userAgent: e.user_agent ?? "—",
  };
}

const PILL: Record<string, React.CSSProperties> = {
  Login:    { background: "#dcfce7", color: "#166534" },
  Logout:   { background: "#f1f5f9", color: "#475569" },
  "Sign-up":{ background: "#dbeafe", color: "#1e40af" },
};

function pill(action: string, success: boolean, blockedReason: string | null): React.CSSProperties {
  // Correct password, wrong device -- the strongest signal that someone
  // else has valid credentials. Stand this out from both normal logins
  // (green) and simple bad-password failures (soft red).
  if (blockedReason === "device_mismatch") return { background: "#fef3c7", color: "#92400e", fontWeight: 800 };
  if (blockedReason) return { background: "#fef3c7", color: "#92400e" };
  if (!success) return { background: "#fee2e2", color: "#991b1b" };
  return PILL[action] ?? { background: "#fef9c3", color: "#713f12" };
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-MY", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/audit-log?limit=500");
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setRows((data.entries ?? []).map(parseEntry));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const visible = filter
    ? rows.filter(r =>
        r.email.toLowerCase().includes(filter.toLowerCase()) ||
        r.action.toLowerCase().includes(filter.toLowerCase()) ||
        r.ip.includes(filter) ||
        r.userAgent.toLowerCase().includes(filter.toLowerCase())
      )
    : rows;

  return (
    <main style={{
      minHeight: "100vh", background: "#f8fafc", padding: "36px 24px",
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#0f172a",
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>← Back</Link>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em" }}>
            Audit Log
          </h1>
          <span style={{ fontSize: "13px", color: "#64748b" }}>Last 500 auth events</span>
          <button
            onClick={load}
            style={{ marginLeft: "auto", background: "#0f172a", color: "#fff", border: "none", borderRadius: "6px", padding: "7px 16px", fontSize: "13px", cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>

        {/* Filter */}
        <input
          type="search"
          placeholder="Filter by email, action, or IP…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", marginBottom: "16px",
            border: "1px solid #e2e8f0", borderRadius: "8px", padding: "9px 14px",
            fontSize: "14px", background: "#fff", color: "#0f172a", outline: "none",
          }}
        />

        {/* Table */}
        {loading ? (
          <p style={{ color: "#64748b", fontSize: "14px" }}>Loading…</p>
        ) : error ? (
          <p style={{ color: "#dc2626", fontSize: "14px" }}>{error}</p>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Timestamp", "Email", "Result", "IP Address", "Device / Browser"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "24px 16px", color: "#94a3b8", textAlign: "center" }}>No entries found</td></tr>
                ) : visible.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#475569", fontVariantNumeric: "tabular-nums" }}>{fmt(r.timestamp)}</td>
                    <td style={{ padding: "10px 16px", fontWeight: 500 }}>{r.email}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ ...pill(r.action, r.success, r.blockedReason), borderRadius: "999px", padding: "2px 10px", fontSize: "12px", fontWeight: 600 }}>
                        {r.action}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#64748b", fontVariantNumeric: "tabular-nums" }}>{r.ip}</td>
                    <td style={{ padding: "10px 16px", color: "#94a3b8", fontSize: "12px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.userAgent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <p style={{ marginTop: "12px", fontSize: "12px", color: "#94a3b8" }}>
            Showing {visible.length} of {rows.length} entries
          </p>
        )}
      </div>
    </main>
  );
}
