"use client";

import { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";

type Credential = {
  id: string;
  label: string;
  username: string;
  active: boolean;
  created_at: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0",
  borderRadius: "6px", fontSize: "13px", outline: "none", background: "#fff",
  boxSizing: "border-box",
};

export default function NirvanaCredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({ label: "", username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nirvana-credentials");
      const data = await res.json();
      if (data.credentials) setCredentials(data.credentials);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addCredential() {
    if (!form.label || !form.username || !form.password) {
      setError("All fields are required"); return;
    }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await fetch("/api/nirvana-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSuccess(`${form.label} added successfully`);
      setForm({ label: "", username: "", password: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/nirvana-credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    await load();
  }

  async function deleteCredential(id: string, label: string) {
    if (!confirm(`Remove ${label}?`)) return;
    await fetch("/api/nirvana-credentials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function testCredential(id: string) {
    setTestingId(id);
    try {
      const res = await fetch("/api/nirvana-credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setTestResult(prev => ({ ...prev, [id]: { ok: data.ok, msg: data.message } }));
    } catch {
      setTestResult(prev => ({ ...prev, [id]: { ok: false, msg: "Request failed" } }));
    } finally {
      setTestingId(null);
    }
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: "40px 28px",
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <AdminGuard />
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>

        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Nirvana Portal Credentials</h1>
          <p style={{ color: "#64748b", fontSize: "13px", margin: "6px 0 0" }}>
            Manage agent login IDs used for product sync downloads. Credentials are stored securely and never exposed to the browser.
          </p>
        </div>

        {/* Add form */}
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 16px" }}>Add Credential</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 500 }}>NAME / LABEL</div>
              <input
                style={inputStyle}
                placeholder="e.g. Ahmad bin Ali"
                value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 500 }}>USERNAME</div>
              <input
                style={inputStyle}
                placeholder="Portal login username"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 500 }}>PASSWORD</div>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: "36px" }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Portal password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="new-password"
                />
                <button
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "12px" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>
          {error && <p style={{ color: "#dc2626", fontSize: "12px", margin: "0 0 10px" }}>{error}</p>}
          {success && <p style={{ color: "#16a34a", fontSize: "12px", margin: "0 0 10px" }}>{success}</p>}
          <button
            onClick={addCredential}
            disabled={saving}
            style={{
              background: saving ? "#94a3b8" : "#0f172a", color: "#fff",
              border: "none", borderRadius: "6px", padding: "8px 18px",
              fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 500,
            }}
          >
            {saving ? "Saving…" : "Add Credential"}
          </button>
        </div>

        {/* Credentials list */}
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
              Active Credentials
              <span style={{ marginLeft: "8px", fontSize: "12px", color: "#64748b", fontWeight: 400 }}>
                {credentials.filter(c => c.active).length} active · {credentials.length} total
              </span>
            </h2>
          </div>

          {loading ? (
            <p style={{ padding: "20px", color: "#94a3b8", fontSize: "13px" }}>Loading…</p>
          ) : credentials.length === 0 ? (
            <p style={{ padding: "20px", color: "#94a3b8", fontSize: "13px" }}>No credentials added yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {["Name", "Username", "Status", "Added", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 16px", color: "#64748b", fontWeight: 500, fontSize: "11px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {credentials.map(c => {
                  const result = testResult[c.id];
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 500 }}>{c.label}</td>
                      <td style={{ padding: "10px 16px", color: "#475569", fontFamily: "monospace", fontSize: "12px" }}>{c.username}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <button
                          onClick={() => toggleActive(c.id, c.active)}
                          style={{
                            padding: "3px 10px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 500,
                            background: c.active ? "#dcfce7" : "#f1f5f9",
                            color: c.active ? "#16a34a" : "#64748b",
                          }}
                        >
                          {c.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td style={{ padding: "10px 16px", color: "#94a3b8", fontSize: "11px" }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button
                            onClick={() => testCredential(c.id)}
                            disabled={testingId === c.id}
                            style={{
                              padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: "5px",
                              background: "#fff", fontSize: "11px", cursor: "pointer", color: "#475569",
                            }}
                          >
                            {testingId === c.id ? "Testing…" : "Test Login"}
                          </button>
                          {result && (
                            <span style={{ fontSize: "11px", color: result.ok ? "#16a34a" : "#dc2626" }}>
                              {result.ok ? "✓ OK" : `✗ ${result.msg}`}
                            </span>
                          )}
                          <button
                            onClick={() => deleteCredential(c.id, c.label)}
                            style={{
                              padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: "5px",
                              background: "#fff", fontSize: "11px", cursor: "pointer", color: "#dc2626",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "16px" }}>
          Passwords are stored encrypted at rest in Supabase and are only used server-side. They are never sent to the browser.
        </p>
      </div>
    </main>
  );
}
