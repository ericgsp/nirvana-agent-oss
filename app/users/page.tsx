"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type User = {
  id: string;
  email: string;
  created_at: string;
  role: "admin" | "agent" | null;
  device_bound_at: string | null;
  device_user_agent: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  agent: "Agent",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "agent">("agent");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", email: newEmail, password: newPassword, role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error ?? "Failed to create user");
    } else {
      setCreateSuccess(`${newEmail} created as ${newRole}.`);
      setNewEmail("");
      setNewPassword("");
      setNewRole("agent");
      loadUsers();
    }
    setCreating(false);
  }

  async function setRole(user_id: string, role: "admin" | "agent") {
    setSaving(user_id);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_role", user_id, role }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    } else {
      setUsers(prev => prev.map(u => u.id === user_id ? { ...u, role } : u));
    }
    setSaving(null);
  }

  async function resetDevice(user_id: string) {
    setSaving(user_id);
    setError(null);
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_device", user_id }),
    });
    setSaving(null);
  }

  async function removeRole(user_id: string) {
    setSaving(user_id);
    setError(null);
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to remove");
    } else {
      setUsers(prev => prev.map(u => u.id === user_id ? { ...u, role: null } : u));
    }
    setSaving(null);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: "40px 28px", fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none", display: "inline-block", marginBottom: "20px" }}>
          ← Back
        </Link>

        <h1 style={{ margin: "0 0 6px", fontSize: "28px", letterSpacing: "-0.03em" }}>User Management</h1>
        <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: "14px" }}>
          Set each user's role. <strong>Admin</strong> can access all pages. <strong>Agent</strong> can only use the agent app.
          Users with no role cannot access anything.
        </p>

        {/* Create user form */}
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 16px rgba(15,23,42,0.06)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>Add New User</h2>
          <form onSubmit={createUser} style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 200px" }}>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "#64748b" }}>Email</label>
              <input
                type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "8px 10px", fontSize: "14px", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 160px" }}>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "#64748b" }}>Password</label>
              <input
                type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "8px 10px", fontSize: "14px", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "#64748b" }}>Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as "admin" | "agent")}
                style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "8px 10px", fontSize: "14px", outline: "none", background: "#fff" }}>
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={creating}
              style={{ padding: "8px 20px", borderRadius: "6px", background: creating ? "#94a3b8" : "#0f172a", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: creating ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {creating ? "Creating…" : "Create User"}
            </button>
          </form>
          {createError && <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#dc2626" }}>{createError}</p>}
          {createSuccess && <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#16a34a" }}>{createSuccess}</p>}
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#dc2626", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflowX: "auto", boxShadow: "0 4px 16px rgba(15,23,42,0.06)" }}>
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>Loading users…</div>
          ) : users.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>No users found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Current Role</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Device Bound</th>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "14px 20px", fontSize: "14px" }}>{user.email}</td>
                    <td style={{ padding: "14px 20px" }}>
                      {user.role ? (
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: user.role === "admin" ? "#eff6ff" : "#f0fdf4",
                          color: user.role === "admin" ? "#1d4ed8" : "#15803d",
                          border: user.role === "admin" ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
                        }}>
                          {ROLE_LABEL[user.role]}
                        </span>
                      ) : (
                        <span style={{ fontSize: "13px", color: "#94a3b8" }}>No role</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {user.role === "agent" ? (
                        user.device_bound_at ? (
                          <div>
                            <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                              Bound
                            </span>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                              {new Date(user.device_bound_at).toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                            </div>
                            {user.device_user_agent && (
                              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={user.device_user_agent}>
                                {user.device_user_agent}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: "#fef9c3", color: "#713f12", border: "1px solid #fde68a" }}>
                            Not yet bound
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: "13px", color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {(["admin", "agent"] as const).map(r => (
                          <button
                            key={r}
                            disabled={saving === user.id || user.role === r}
                            onClick={() => setRole(user.id, r)}
                            style={{
                              padding: "5px 14px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 500,
                              border: user.role === r ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
                              background: user.role === r ? "#f1f5f9" : "#fff",
                              color: user.role === r ? "#94a3b8" : "#334155",
                              cursor: user.role === r || saving === user.id ? "not-allowed" : "pointer",
                              opacity: saving === user.id ? 0.6 : 1,
                            }}
                          >
                            {ROLE_LABEL[r]}
                          </button>
                        ))}
                        {user.role === "agent" && (
                          <button
                            disabled={saving === user.id}
                            onClick={() => resetDevice(user.id)}
                            style={{
                              padding: "5px 14px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 500,
                              border: "1px solid #fed7aa",
                              background: "#fff",
                              color: "#c2410c",
                              cursor: saving === user.id ? "not-allowed" : "pointer",
                              opacity: saving === user.id ? 0.6 : 1,
                            }}
                          >
                            Reset Device
                          </button>
                        )}
                        {user.role && (
                          <button
                            disabled={saving === user.id}
                            onClick={() => removeRole(user.id)}
                            style={{
                              padding: "5px 14px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 500,
                              border: "1px solid #fee2e2",
                              background: "#fff",
                              color: "#dc2626",
                              cursor: saving === user.id ? "not-allowed" : "pointer",
                              opacity: saving === user.id ? 0.6 : 1,
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
