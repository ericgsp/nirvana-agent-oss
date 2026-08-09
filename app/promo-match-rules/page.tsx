"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

type Rule = {
  id: string;
  memo_reference: string | null;
  site_code: string;
  promo_name: string | null;
  product_name: string | null;
  lot_type: string | null;
  match_scope: string;
  lot_range: string | null;
  level_restriction: string | null;
  lot_type_scope: string | null;
  discount_pct: number | null;
  discount_rm: number | null;
  min_down_payment_pct: number | null;
  dp_tiers: number[] | null;
  max_instalment_months: number | null;
  instalment_tiers: { max_price: number | null; months: number }[] | null;
  dr_plus_eligible: boolean;
  dr_plus_type: string | null;
  dr_plus_fixed_units: number | null;
  is_combo: boolean;
  combo_total_price: number | null;
  active: boolean;
  promo_start_date: string | null;
  promo_end_date: string | null;
  remarks: string | null;
};

const emptyRule = (): Omit<Rule, "id"> => ({
  memo_reference: null,
  site_code: "",
  promo_name: null,
  product_name: null,
  lot_type: null,
  match_scope: "all",
  lot_range: null,
  level_restriction: null,
  lot_type_scope: null,
  discount_pct: null,
  discount_rm: null,
  min_down_payment_pct: null,
  dp_tiers: null,
  max_instalment_months: null,
  instalment_tiers: null,
  dr_plus_eligible: false,
  dr_plus_type: null,
  dr_plus_fixed_units: null,
  is_combo: false,
  combo_total_price: null,
  active: true,
  promo_start_date: null,
  promo_end_date: null,
  remarks: null,
});

const th: React.CSSProperties = {
  padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b",
  borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", background: "#f8fafc",
  position: "sticky", top: 0, zIndex: 1,
};
const td: React.CSSProperties = {
  padding: "7px 10px", fontSize: "13px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
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
const selectStyle: React.CSSProperties = { ...inp, cursor: "pointer" };

const badge = (active: boolean): React.CSSProperties => ({
  display: "inline-block", padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
  background: active ? "#dcfce7" : "#f1f5f9",
  color: active ? "#166534" : "#64748b",
});

function RuleForm({ initial, onSave, onCancel }: {
  initial: Omit<Rule, "id"> & { id?: string };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value === "" ? null : value }));
  }

  async function handleSave() {
    if (!form.site_code || !form.match_scope) {
      setError("Site and Match Scope are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px", display: "block",
  };
  const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px" };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fff", padding: "20px", marginBottom: "20px" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700 }}>
        {(initial as any).id ? "Edit Rule" : "New Rule"}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={fieldGroup}>
          <label style={labelStyle}>Site *</label>
          <input style={inp} value={form.site_code} onChange={e => set("site_code", e.target.value)} placeholder="e.g. Semenyih-NMG" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Promo Name</label>
          <select style={selectStyle} value={form.promo_name ?? ""} onChange={e => set("promo_name", e.target.value)}>
            <option value="">— select —</option>
            <option>Customer Promo</option>
            <option>DRPlus Promo</option>
            <option>Central Promo</option>
            <option>Combo Lot Promo</option>
          </select>
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Product Name</label>
          <input style={inp} value={form.product_name ?? ""} onChange={e => set("product_name", e.target.value)} placeholder="e.g. GARDEN 6 or null=all" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Lot Type</label>
          <input style={inp} value={form.lot_type ?? ""} onChange={e => set("lot_type", e.target.value)} placeholder="e.g. Double" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Match Scope *</label>
          <select style={selectStyle} value={form.match_scope} onChange={e => set("match_scope", e.target.value)}>
            <option value="all">all</option>
            <option value="lot_range">lot_range</option>
            <option value="level">level</option>
            <option value="lot_type_scope">lot_type_scope</option>
          </select>
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Lot Range</label>
          <input style={inp} value={form.lot_range ?? ""} onChange={e => set("lot_range", e.target.value)} placeholder="e.g. DA~DH (8~268)" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Level Restriction</label>
          <input style={inp} value={form.level_restriction ?? ""} onChange={e => set("level_restriction", e.target.value)} placeholder="e.g. 3,4,5" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Lot Type Scope</label>
          <input style={inp} value={form.lot_type_scope ?? ""} onChange={e => set("lot_type_scope", e.target.value)} placeholder="e.g. S,D,Niche" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Discount %</label>
          <input style={inp} type="number" value={form.discount_pct ?? ""} onChange={e => set("discount_pct", e.target.value ? parseFloat(e.target.value) : null)} />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Discount RM</label>
          <input style={inp} type="number" value={form.discount_rm ?? ""} onChange={e => set("discount_rm", e.target.value ? parseFloat(e.target.value) : null)} />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Min DP %</label>
          <input style={inp} type="number" value={form.min_down_payment_pct ?? ""} onChange={e => set("min_down_payment_pct", e.target.value ? parseFloat(e.target.value) : null)} />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Max Instalment Months</label>
          <input style={inp} type="number" value={form.max_instalment_months ?? ""} onChange={e => set("max_instalment_months", e.target.value ? parseInt(e.target.value) : null)} />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>DR Plus Fixed Units</label>
          <input style={inp} type="number" value={form.dr_plus_fixed_units ?? ""} onChange={e => set("dr_plus_fixed_units", e.target.value ? parseInt(e.target.value) : null)} />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Memo Reference</label>
          <input style={inp} value={form.memo_reference ?? ""} onChange={e => set("memo_reference", e.target.value)} placeholder="e.g. NVA/CUS/HOD/CIR/101/2026" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Promo Start Date</label>
          <input style={inp} type="date" value={form.promo_start_date ?? ""} onChange={e => set("promo_start_date", e.target.value)} />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Promo End Date</label>
          <input style={inp} type="date" value={form.promo_end_date ?? ""} onChange={e => set("promo_end_date", e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
          <input type="checkbox" checked={form.dr_plus_eligible} onChange={e => set("dr_plus_eligible", e.target.checked)} />
          DR Plus Eligible
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_combo} onChange={e => set("is_combo", e.target.checked)} />
          Combo
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
          <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)} />
          Active
        </label>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Remarks</label>
        <input style={{ ...inp, width: "100%" }} value={form.remarks ?? ""} onChange={e => set("remarks", e.target.value)} />
      </div>

      {error && <div style={{ marginBottom: "10px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "8px" }}>
        <button style={btnGreen} disabled={saving} onClick={handleSave}>{saving ? "Saving…" : "Save Rule"}</button>
        <button style={btn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function PromoMatchRulesPage() {
  const [rows, setRows]       = useState<Rule[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sites, setSites]     = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [site, setSite]       = useState("");
  const [active, setActive]   = useState("1");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow]   = useState<Rule | null>(null);

  const fetchData = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(p) });
    if (site)   params.set("site", site);
    if (active) params.set("active", active);
    try {
      const res  = await fetch(`/api/promo-match-rules?${params}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setRows(json.rows);
      setTotal(json.total);
      setTotalPages(json.totalPages);
      setSites(json.sites);
    } finally {
      setLoading(false);
    }
  }, [site, active, page]);

  useEffect(() => { fetchData(1); }, []);

  async function handleSave(data: any) {
    if (data.id) {
      const res = await fetch("/api/promo-match-rules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
    } else {
      const res = await fetch("/api/promo-match-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
    }
    setShowForm(false);
    setEditRow(null);
    fetchData(1);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rule?")) return;
    const res = await fetch("/api/promo-match-rules", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const json = await res.json();
    if (json.error) { alert(json.error); return; }
    fetchData(page);
  }

  async function toggleActive(row: Rule) {
    const res = await fetch("/api/promo-match-rules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, active: !row.active }) });
    const json = await res.json();
    if (json.error) { alert(json.error); return; }
    fetchData(page);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: "32px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <AdminGuard />
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>Promo Match Rules</h1>
          {!loading && <span style={{ marginLeft: "auto", fontSize: "13px", color: "#64748b" }}>{total} rules</span>}
        </div>

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
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Site</div>
            <select style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#fff", minWidth: "160px" }} value={site} onChange={e => setSite(e.target.value)}>
              <option value="">All sites</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</div>
            <select style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#fff" }} value={active} onChange={e => setActive(e.target.value)}>
              <option value="">All</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <button style={btnPrimary} onClick={() => { setPage(1); fetchData(1); }}>Apply</button>
          <button style={btn} onClick={() => { setSite(""); setActive("1"); setPage(1); fetchData(1); }}>Clear</button>
        </div>

        {error && <div style={{ padding: "12px 16px", borderRadius: "8px", background: "#fef2f2", color: "#991b1b", marginBottom: "16px", fontSize: "13px" }}>{error}</div>}

        <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fff", overflow: "auto", boxShadow: "0 1px 4px rgba(15,23,42,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={th}>Site</th>
                <th style={th}>Promo Name</th>
                <th style={th}>Product</th>
                <th style={th}>Lot Type</th>
                <th style={th}>Match Scope</th>
                <th style={th}>Lot Range</th>
                <th style={th}>Level</th>
                <th style={th}>Type Scope</th>
                <th style={th}>Discount</th>
                <th style={th}>Min DP</th>
                <th style={th}>Max Inst.</th>
                <th style={th}>DR Plus</th>
                <th style={th}>Period</th>
                <th style={th}>Memo</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={16} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "40px" }}>Loading…</td></tr>
              ) : !rows.length ? (
                <tr><td colSpan={16} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "40px" }}>No rules found. Add your first rule above.</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={td}>
                    <button style={{ ...badge(row.active), border: "none", cursor: "pointer" }} onClick={() => toggleActive(row)}>
                      {row.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={td}>{row.site_code}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#1e40af" }}>{row.promo_name ?? "—"}</td>
                  <td style={td}>{row.product_name ?? <span style={{ color: "#94a3b8" }}>all</span>}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.lot_type ?? "—"}</td>
                  <td style={td}>
                    <span style={{ background: "#f1f5f9", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", fontWeight: 600 }}>
                      {row.match_scope}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: "12px", color: "#64748b" }}>{row.lot_range ?? "—"}</td>
                  <td style={{ ...td, fontSize: "12px", color: "#64748b" }}>{row.level_restriction ?? "—"}</td>
                  <td style={{ ...td, fontSize: "12px", color: "#64748b" }}>{row.lot_type_scope ?? "—"}</td>
                  <td style={td}>
                    {row.discount_rm ? `RM ${row.discount_rm.toLocaleString()}` : row.discount_pct ? `${row.discount_pct}%` : "—"}
                  </td>
                  <td style={td}>{row.min_down_payment_pct ? `${row.min_down_payment_pct}%` : row.dp_tiers ? row.dp_tiers.join("/") + "%" : "—"}</td>
                  <td style={td}>{row.max_instalment_months ? `${row.max_instalment_months}m` : row.instalment_tiers ? "Tiered" : "—"}</td>
                  <td style={td}>
                    {row.dr_plus_eligible
                      ? <span style={{ background: "#dcfce7", color: "#166534", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", fontWeight: 600 }}>
                          {row.dr_plus_fixed_units ? `${row.dr_plus_fixed_units} units` : "Yes"}
                        </span>
                      : <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ ...td, fontSize: "12px", color: "#64748b" }}>
                    {row.promo_start_date?.slice(0, 10)} → {row.promo_end_date?.slice(0, 10)}
                  </td>
                  <td style={{ ...td, fontSize: "11px", color: "#64748b" }}>{row.memo_reference ?? "—"}</td>
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
