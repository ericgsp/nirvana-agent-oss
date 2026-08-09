"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

type Rule = {
  id: string;
  rule_type: string;
  site_code: string | null;
  product_name: string | null;
  rule_key: string | null;
  rule_value: string;
  description: string | null;
  active: boolean;
  created_at: string;
};

const emptyRule = (): Omit<Rule, "id" | "created_at"> => ({
  rule_type: "",
  site_code: null,
  product_name: null,
  rule_key: null,
  rule_value: "",
  description: null,
  active: true,
});

const th: React.CSSProperties = {
  padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b",
  borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", background: "#f8fafc",
  position: "sticky", top: 0, zIndex: 1,
};
const td: React.CSSProperties = {
  padding: "7px 10px", fontSize: "13px", borderBottom: "1px solid #f1f5f9",
};
const inp: React.CSSProperties = {
  border: "1px solid #e2e8f0", borderRadius: "4px", padding: "4px 8px",
  fontSize: "13px", width: "100%", boxSizing: "border-box",
};
const btn: React.CSSProperties = {
  padding: "6px 14px", borderRadius: "6px", border: "1px solid #e2e8f0",
  background: "#fff", fontSize: "13px", color: "#334155", cursor: "pointer",
};
const btnPrimary: React.CSSProperties = { ...btn, background: "#0f172a", color: "#fff", border: "none" };
const btnGreen: React.CSSProperties = { ...btn, background: "#16a34a", color: "#fff", border: "none" };
const btnRed: React.CSSProperties = { ...btn, background: "#dc2626", color: "#fff", border: "none" };
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px", display: "block",
};
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px" };

const RULE_TYPE_OPTIONS = [
  { value: "section_sequence", label: "Section Sequence" },
  { value: "lot_code_prefix", label: "Lot Code Prefix" },
  { value: "range_expansion", label: "Range Expansion" },
];

function RuleForm({ initial, onSave, onCancel }: {
  initial: Omit<Rule, "id" | "created_at"> & { id?: string };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function set(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value === "" ? null : value }));
  }

  async function handleSave() {
    if (!form.rule_type || !form.rule_value) {
      setError("Rule Type and Rule Value are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try { await onSave(form); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fff", padding: "20px", marginBottom: "20px" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700 }}>
        {(initial as any).id ? "Edit Rule" : "New Rule"}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={fieldGroup}>
          <label style={labelStyle}>Rule Type *</label>
          <input style={inp} list="rule-type-list" value={form.rule_type} onChange={e => set("rule_type", e.target.value)} placeholder="e.g. section_sequence" />
          <datalist id="rule-type-list">
            {RULE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </datalist>
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Site Code</label>
          <input style={inp} value={form.site_code ?? ""} onChange={e => set("site_code", e.target.value)} placeholder="null = all sites" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Product Name</label>
          <input style={inp} value={form.product_name ?? ""} onChange={e => set("product_name", e.target.value)} placeholder="null = all products" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Rule Key</label>
          <input style={inp} value={form.rule_key ?? ""} onChange={e => set("rule_key", e.target.value)} placeholder="e.g. SF, D, NV-S" />
        </div>
      </div>

      <div style={{ ...fieldGroup, marginBottom: "12px" }}>
        <label style={labelStyle}>Rule Value *</label>
        <textarea
          style={{ ...inp, height: "80px", resize: "vertical", fontFamily: "monospace" }}
          value={form.rule_value}
          onChange={e => set("rule_value", e.target.value)}
          placeholder="e.g. DAB,DAA,DA,DB,DD,DE,DF,DG,DH,DJ,DK,DL,DM,DN,DO,DP,DQ,DR,DS,DT,DU,DV,DW,DX,DY,DZ"
        />
      </div>

      <div style={{ ...fieldGroup, marginBottom: "12px" }}>
        <label style={labelStyle}>Description</label>
        <input style={inp} value={form.description ?? ""} onChange={e => set("description", e.target.value)} placeholder="Plain English explanation of this rule" />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
          <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)} />
          Active
        </label>
      </div>

      {error && <div style={{ marginBottom: "10px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "8px" }}>
        <button style={btnGreen} disabled={saving} onClick={handleSave}>{saving ? "Saving…" : "Save Rule"}</button>
        <button style={btn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function SystemRulesPage() {
  const [rows, setRows]         = useState<Rule[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ruleTypes, setRuleTypes]   = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [ruleType, setRuleType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState<Rule | null>(null);

  const fetchData = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(p) });
    if (ruleType) params.set("rule_type", ruleType);
    try {
      const res  = await fetch(`/api/system-rules?${params}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setRows(json.rows);
      setTotal(json.total);
      setTotalPages(json.totalPages);
      setRuleTypes(json.ruleTypes);
    } finally {
      setLoading(false);
    }
  }, [ruleType, page]);

  useEffect(() => { fetchData(1); }, []);

  async function handleSave(data: any) {
    const method = data.id ? "PATCH" : "POST";
    const res = await fetch("/api/system-rules", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    setShowForm(false);
    setEditRow(null);
    fetchData(1);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rule?")) return;
    const res = await fetch("/api/system-rules", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const json = await res.json();
    if (json.error) { alert(json.error); return; }
    fetchData(page);
  }

  async function toggleActive(row: Rule) {
    const res = await fetch("/api/system-rules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, active: !row.active }) });
    const json = await res.json();
    if (json.error) { alert(json.error); return; }
    fetchData(page);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: "32px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <AdminGuard />
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
          <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>System Rules</h1>
          {!loading && <span style={{ marginLeft: "auto", fontSize: "13px", color: "#64748b" }}>{total} rules</span>}
        </div>

        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px" }}>
          Permanent rules used to process and match promotion data — section sequences, lot code prefixes, range expansion logic, and more.
        </p>

        {(showForm || editRow) ? (
          <RuleForm
            initial={editRow ? { ...editRow } : emptyRule()}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditRow(null); }}
          />
        ) : (
          <div style={{ marginBottom: "16px" }}>
            <button style={btnPrimary} onClick={() => setShowForm(true)}>+ New Rule</button>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rule Type</div>
            <select style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#fff", minWidth: "180px" }} value={ruleType} onChange={e => setRuleType(e.target.value)}>
              <option value="">All types</option>
              {ruleTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button style={btnPrimary} onClick={() => { setPage(1); fetchData(1); }}>Apply</button>
          <button style={btn} onClick={() => { setRuleType(""); setPage(1); fetchData(1); }}>Clear</button>
        </div>

        {error && <div style={{ padding: "12px 16px", borderRadius: "8px", background: "#fef2f2", color: "#991b1b", marginBottom: "16px", fontSize: "13px" }}>{error}</div>}

        <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fff", overflow: "auto", boxShadow: "0 1px 4px rgba(15,23,42,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={th}>Rule Type</th>
                <th style={th}>Site</th>
                <th style={th}>Product</th>
                <th style={th}>Rule Key</th>
                <th style={{ ...th, minWidth: "300px" }}>Rule Value</th>
                <th style={th}>Description</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "40px" }}>Loading…</td></tr>
              ) : !rows.length ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "40px" }}>No rules yet. Add your first rule above.</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={td}>
                    <button
                      style={{ display: "inline-block", padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer", background: row.active ? "#dcfce7" : "#f1f5f9", color: row.active ? "#166534" : "#64748b" }}
                      onClick={() => toggleActive(row)}
                    >
                      {row.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: "#1e40af" }}>
                    <span style={{ background: "#eff6ff", borderRadius: "4px", padding: "2px 7px", fontSize: "11px" }}>{row.rule_type}</span>
                  </td>
                  <td style={{ ...td, color: "#64748b", fontSize: "12px" }}>{row.site_code ?? <span style={{ color: "#cbd5e1" }}>all</span>}</td>
                  <td style={{ ...td, fontWeight: 500 }}>{row.product_name ?? <span style={{ color: "#cbd5e1" }}>all</span>}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: "12px", fontWeight: 600 }}>{row.rule_key ?? "—"}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: "11px", color: "#334155", maxWidth: "400px", whiteSpace: "normal", wordBreak: "break-all" }}>{row.rule_value}</td>
                  <td style={{ ...td, fontSize: "12px", color: "#64748b", maxWidth: "200px", whiteSpace: "normal" }}>{row.description ?? "—"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button style={{ ...btn, padding: "3px 10px", fontSize: "12px" }} onClick={() => { setEditRow(row); setShowForm(false); }}>Edit</button>
                      <button style={{ ...btnRed, padding: "3px 10px", fontSize: "12px" }} onClick={() => handleDelete(row.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px", fontSize: "13px", color: "#64748b" }}>
            <button style={btn} disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}>← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button style={btn} disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}>Next →</button>
          </div>
        )}
      </div>
    </main>
  );
}
