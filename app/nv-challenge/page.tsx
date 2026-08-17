"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

type Challenge = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  target_amount: number;
};

const emptyChallenge = (): Omit<Challenge, "id"> => ({
  title: "",
  start_date: "",
  end_date: "",
  target_amount: 0,
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function NvChallengePage() {
  const [rows, setRows] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Challenge, "id">>(emptyChallenge());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/nv-challenges")
      .then((r) => r.json())
      .then((data) => setRows(data.rows ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(row: Challenge) {
    setEditingId(row.id);
    setForm({ title: row.title, start_date: row.start_date, end_date: row.end_date, target_amount: row.target_amount });
    setError("");
  }

  function startNew() {
    setEditingId("new");
    setForm(emptyChallenge());
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyChallenge());
    setError("");
  }

  async function save() {
    setError("");
    if (!form.title || !form.start_date || !form.end_date || !form.target_amount) {
      setError("All fields are required.");
      return;
    }
    if (form.start_date > form.end_date) {
      setError("Start date must be before end date.");
      return;
    }
    setSaving(true);
    try {
      const isNew = editingId === "new";
      const res = await fetch("/api/nv-challenges", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? form : { id: editingId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      cancelEdit();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this challenge? Agents will stop seeing progress toward it.")) return;
    await fetch("/api/nv-challenges", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const today = todayStr();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px", fontFamily: "system-ui, sans-serif" }}>
      <AdminGuard />
      <Link href="/agent" style={{ fontSize: 13, color: "#2563EB" }}>&larr; Back to app</Link>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "10px 0 4px", color: "#0f172a" }}>NV Challenge</h1>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>
        Set the current challenge&apos;s date range and target quota. The Home tab shows each agent&apos;s
        accumulated quota vs. this target for whichever challenge is active today.
      </p>

      <button
        onClick={startNew}
        style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 16 }}
      >
        + New Challenge
      </button>

      {editingId && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 20, background: "#f8fafc" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: "#475569" }}>
              Title
              <input
                type="text" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. NV Challenge Q3 2026"
                style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
              Start date
              <input
                type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
              End date
              <input
                type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
              />
            </label>
            <label style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: "#475569" }}>
              Target quota (RM), per agent
              <input
                type="number" min={0} value={form.target_amount || ""}
                onChange={(e) => setForm({ ...form, target_amount: Number(e.target.value) })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
              />
            </label>
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 12.5, marginTop: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={save} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancelEdit} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>No challenges yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row) => {
            const isActive = row.start_date <= today && today <= row.end_date;
            return (
              <div key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", background: isActive ? "#eff6ff" : "#fff" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    {row.title} {isActive && <span style={{ fontSize: 10, fontWeight: 800, color: "#2563EB", marginLeft: 6 }}>ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {row.start_date} &ndash; {row.end_date} &middot; Target RM {Number(row.target_amount).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => startEdit(row)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => remove(row.id)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
