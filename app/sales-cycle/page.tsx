"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

type ClosingRow = {
  period: string;
  closing_date: string;
  updated_at: string;
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SalesCyclePage() {
  const [rows, setRows] = useState<ClosingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(currentPeriod());
  const [closingDate, setClosingDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/sales-cycle-closing")
      .then((r) => r.json())
      .then((data) => setRows(data.rows ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function editPeriod(row: ClosingRow) {
    setPeriod(row.period);
    setClosingDate(row.closing_date);
    setError("");
  }

  async function save() {
    setError("");
    if (!period || !closingDate) {
      setError("Period and closing date are required.");
      return;
    }
    if (!closingDate.startsWith(period)) {
      setError("Closing date must fall within the selected period (" + period + ").");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sales-cycle-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, closing_date: closingDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", fontFamily: "system-ui, sans-serif" }}>
      <AdminGuard />
      <Link href="/agent" style={{ fontSize: 13, color: "#2563EB" }}>&larr; Back to app</Link>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "10px 0 4px", color: "#0f172a" }}>Sales Cycle Closing Date</h1>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>
        Set the cutoff date for each month&apos;s sales cycle. Defaults to the last calendar day if not
        set. Update the same period anytime to extend it &mdash; the Home tab&apos;s countdown pill
        picks up the change on next refresh.
      </p>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 20, background: "#f8fafc" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
            Period (YYYY-MM)
            <input
              type="month" value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
            Closing date
            <input
              type="date" value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
            />
          </label>
        </div>
        {error && <div style={{ color: "#dc2626", fontSize: 12.5, marginTop: 10 }}>{error}</div>}
        <button onClick={save} disabled={saving} style={{ marginTop: 14, padding: "8px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>No closing dates set yet &mdash; every period defaults to its calendar month-end.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row) => (
            <div key={row.period} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: row.period === currentPeriod() ? "#eff6ff" : "#fff" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{row.period}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Closes {row.closing_date}</div>
              </div>
              <button onClick={() => editPeriod(row)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
