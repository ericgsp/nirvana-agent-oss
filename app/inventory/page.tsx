"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

type InventoryRow = {
  lot_id: string;
  site: string;
  zone: string;
  lot_code: string;
  niche_section: string | null;
  niche_level: string | null;
  lot_section: string | null;
  lot_num: number | null;
  product_name: string;
  product_category: string;
  lot_type: string | null;
  size_description: string | null;
  pre_need_price: number | null;
  as_need_price: number | null;
  trust_account_facility: number | null;
  backwall_cost: number | null;
  // promo fields (one row per promo type)
  promo_rule_id: string;
  promo_name: string;
  purchase_condition: string | null;
  promo_level_restriction: string | null;
  promo_lot_range: string | null;
  memo_reference: string | null;
  is_combo: boolean | null;
  combo_total_price: number | null;
  combo_product_name: string | null;
  combo_product_price: number | null;
  discount_pct: number | null;
  discount_rm: number | null;
  min_down_payment_pct: number | null;
  max_instalment_months: number | null;
  dr_plus_eligible: boolean | null;
  dr_plus_type: string | null;
  dr_plus_fixed_units: number | null;
  dp_tiers: number[] | null;
  instalment_tiers: { max_price: number | null; months: number }[] | null;
  promo_remarks: string | null;
  promo_start_date: string;
  promo_end_date: string;
  promo_price: number | null;
  dp_amount: number | null;
  monthly_instalment: number | null;
};

type ApiResponse = {
  rows: InventoryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: { sites: string[]; zones: string[]; categories: string[]; promos: string[] };
};

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-MY");
}

function fmtDiscount(row: InventoryRow) {
  if (row.is_combo)          return `Combo`;
  if (row.discount_rm != null)  return `RM ${row.discount_rm.toLocaleString("en-MY")} off`;
  if (row.discount_pct != null) return `${row.discount_pct}%`;
  if (row.dp_tiers?.length)     return `DP-linked`;
  return "—";
}

function fmtMaxMonths(row: InventoryRow) {
  if (row.max_instalment_months != null) return `${row.max_instalment_months}`;
  if (row.instalment_tiers?.length) {
    const max = Math.max(...row.instalment_tiers.map(t => t.months));
    return `≤${max}`;
  }
  return "—";
}

const th: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
  background: "#f8fafc",
  position: "sticky",
  top: 0,
  zIndex: 2,
};

const td: React.CSSProperties = {
  padding: "7px 12px",
  fontSize: "13px",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};

const tdNum: React.CSSProperties = {
  ...td,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #e2e8f0",
  fontSize: "13px",
  background: "#fff",
  color: "#0f172a",
  minWidth: "140px",
};

const btnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontSize: "13px",
  color: "#334155",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  ...btnStyle,
  background: "#0f172a",
  color: "#fff",
  border: "none",
};

const PROMO_COLOURS: Record<string, { bg: string; color: string }> = {
  "Customer Promo":               { bg: "#dcfce7", color: "#166534" },
  "Customer Promo - Cash Purchase": { bg: "#dbeafe", color: "#1d4ed8" },
  "Central Promo":                { bg: "#fef3c7", color: "#92400e" },
  "DRPlus Promo":                 { bg: "#fce7f3", color: "#9d174d" },
  "Combo Lot":                    { bg: "#fff7ed", color: "#c2410c" },
};

function promoChipStyle(promoName: string): React.CSSProperties {
  const c = PROMO_COLOURS[promoName] ?? { bg: "#f1f5f9", color: "#334155" };
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "999px",
    background: c.bg,
    color: c.color,
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
}

const COLS = 19;

export default function InventoryPage() {
  const [data, setData]       = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [site, setSite]         = useState("");
  const [zone, setZone]         = useState("");
  const [category, setCategory] = useState("");
  const [promo, setPromo]       = useState("");
  const [page, setPage]         = useState(1);

  const fetchData = useCallback(async (overridePage?: number) => {
    setLoading(true);
    setError(null);
    const p = overridePage ?? page;
    const params = new URLSearchParams();
    if (site)     params.set("site", site);
    if (zone)     params.set("zone", zone);
    if (category) params.set("category", category);
    if (promo)    params.set("promo", promo);
    params.set("page", String(p));
    try {
      const res  = await fetch(`/api/inventory?${params}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [site, zone, category, promo, page]);

  useEffect(() => { fetchData(); }, []);

  function applyFilters() { setPage(1); fetchData(1); }

  function clearFilters() {
    setSite(""); setZone(""); setCategory(""); setPromo("");
    setPage(1);
    setLoading(true);
    fetch("/api/inventory?page=1")
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }

  const filters = data?.filters;

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: "32px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <AdminGuard />
      <div style={{ maxWidth: "1800px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Available Inventory
          </h1>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "4px" }}>
            One row per lot per promo type
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Site</div>
            <select style={selectStyle} value={site} onChange={e => setSite(e.target.value)}>
              <option value="">All sites</option>
              {filters?.sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Product</div>
            <select style={{ ...selectStyle, minWidth: "160px" }} value={zone} onChange={e => setZone(e.target.value)}>
              <option value="">All products</option>
              {filters?.zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</div>
            <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {filters?.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Promo Type</div>
            <select style={{ ...selectStyle, minWidth: "200px" }} value={promo} onChange={e => setPromo(e.target.value)}>
              <option value="">All promo types</option>
              {filters?.promos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button style={btnPrimary} onClick={applyFilters}>Apply</button>
          <button style={btnStyle} onClick={clearFilters}>Clear</button>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "#fef2f2", color: "#991b1b", marginBottom: "16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", fontSize: "13px", color: "#64748b" }}>
          {data && (
            <>
              <button style={btnStyle} disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}>← Prev</button>
              <span style={{ whiteSpace: "nowrap" }}>
                Page {data.page} of {data.totalPages} &nbsp;·&nbsp; {data.total.toLocaleString()} promo options
              </span>
              <button style={btnStyle} disabled={page >= data.totalPages}
                onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}>Next →</button>
            </>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
            <button style={btnStyle} onClick={() => { const el = document.getElementById("inv-table-scroll"); if (el) el.scrollLeft -= 300; }}>‹ Scroll</button>
            <button style={btnStyle} onClick={() => { const el = document.getElementById("inv-table-scroll"); if (el) el.scrollLeft += 300; }}>Scroll ›</button>
          </div>
        </div>

        {/* Table */}
        <div id="inv-table-scroll" style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fff", overflowX: "auto", overflowY: "visible", boxShadow: "0 1px 4px rgba(15,23,42,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {/* Product info */}
                <th style={th}>Site</th>
                <th style={th}>Product</th>
                <th style={th}>Category</th>
                <th style={th}>Type</th>
                <th style={th}>Lot Code</th>
                <th style={th}>Section</th>
                <th style={th}>Level</th>
                <th style={th}>Size</th>
                {/* Pricing */}
                <th style={{ ...th, textAlign: "right" }}>As-Need</th>
                <th style={{ ...th, textAlign: "right" }}>Pre-Need</th>
                <th style={{ ...th, textAlign: "right" }}>Trust</th>
                <th style={{ ...th, textAlign: "right" }}>Backwall</th>
                {/* Promo */}
                <th style={{ ...th, borderLeft: "2px solid #bbf7d0", background: "#f0fdf4", color: "#166534" }}>Promo Type</th>
                <th style={{ ...th, background: "#f0fdf4", color: "#166534" }}>Memo</th>
                <th style={{ ...th, textAlign: "right", background: "#f0fdf4", color: "#166534" }}>Discount</th>
                <th style={{ ...th, textAlign: "right", background: "#f0fdf4", color: "#166534" }}>Promo Price</th>
                <th style={{ ...th, textAlign: "right", background: "#f0fdf4", color: "#166534" }}>Min DP%</th>
                <th style={{ ...th, textAlign: "right", background: "#f0fdf4", color: "#166534" }}>DP Amt</th>
                <th style={{ ...th, textAlign: "right", background: "#f0fdf4", color: "#166534" }}>Max Inst.</th>
                <th style={{ ...th, textAlign: "right", background: "#f0fdf4", color: "#166534" }}>Monthly</th>
                <th style={{ ...th, textAlign: "right", background: "#f0fdf4", color: "#166534" }}>DR+</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLS} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "40px" }}>Loading…</td></tr>
              ) : !data?.rows.length ? (
                <tr><td colSpan={COLS} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "40px" }}>No results found.</td></tr>
              ) : data.rows.map((row, i) => (
                <tr key={`${row.lot_id}-${row.promo_rule_id}`} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={td}>{row.site}</td>
                  <td style={{ ...td, fontWeight: 500 }}>{row.zone}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.product_category}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.lot_type ?? "—"}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: "12px" }}>{row.lot_code}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.niche_section ?? row.lot_section ?? "—"}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.niche_level != null ? String(row.niche_level) : "—"}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.size_description ?? "—"}</td>
                  {/* Pricing */}
                  <td style={tdNum}>{row.as_need_price != null ? row.as_need_price.toLocaleString("en-MY") : "—"}</td>
                  <td style={tdNum}>{row.pre_need_price != null ? row.pre_need_price.toLocaleString("en-MY") : "—"}</td>
                  <td style={tdNum}>{row.trust_account_facility != null ? row.trust_account_facility.toLocaleString("en-MY") : "—"}</td>
                  <td style={tdNum}>{row.backwall_cost != null ? row.backwall_cost.toLocaleString("en-MY") : "—"}</td>
                  {/* Promo */}
                  <td style={{ ...td, borderLeft: "2px solid #bbf7d0" }}>
                    <span style={promoChipStyle(row.promo_name)}>{row.promo_name}</span>
                  </td>
                  <td style={{ ...td, color: "#64748b", fontSize: "11px" }}>{row.memo_reference ?? "—"}</td>
                  <td style={{ ...tdNum, color: "#16a34a", fontWeight: 600 }}>{fmtDiscount(row)}</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: "#15803d" }}>{fmt(row.promo_price)}</td>
                  <td style={tdNum}>{row.min_down_payment_pct != null ? `${row.min_down_payment_pct}%` : "—"}</td>
                  <td style={{ ...tdNum, color: "#dc2626" }}>{fmt(row.dp_amount)}</td>
                  <td style={tdNum}>{fmtMaxMonths(row)}</td>
                  <td style={tdNum}>{fmt(row.monthly_instalment)}</td>
                  <td style={{ ...tdNum, color: row.dr_plus_eligible ? "#15803d" : "#cbd5e1", fontWeight: row.dr_plus_eligible ? 600 : 400 }}>
                    {row.dr_plus_eligible ? (row.dr_plus_fixed_units != null ? `${row.dr_plus_fixed_units}u` : "✓") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}
