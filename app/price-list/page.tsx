"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

type PriceListRow = {
  id: string;
  site_code: string;
  product_category: string;
  product_name: string;
  lot_no: string | null;
  size_description: string | null;
  as_need_price: number | null;
  pre_need_price: number | null;
  trust_account_facility: number | null;
  backwall_cost: number | null;
  total_pre_need_price: number | null;
  point_value: number | null;
  wef_date: string | null;
  religion_use: string | null;
  active: boolean | null;
  notes: string | null;
};

type ApiResponse = {
  rows: PriceListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: { sites: string[]; categories: string[]; products: string[] };
};

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-MY");
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
  zIndex: 1,
};

const td: React.CSSProperties = {
  padding: "7px 12px",
  fontSize: "13px",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};

const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

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

export default function PriceListPage() {
  const [data, setData]     = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const [site, setSite]         = useState("");
  const [category, setCategory] = useState("");
  const [product, setProduct]   = useState("");
  const [page, setPage]         = useState(1);

  const fetchData = useCallback(async (overridePage?: number) => {
    setLoading(true);
    setError(null);
    const p = overridePage ?? page;
    const params = new URLSearchParams();
    if (site)     params.set("site", site);
    if (category) params.set("category", category);
    if (product)  params.set("product", product);
    params.set("page", String(p));
    try {
      const res = await fetch(`/api/price-list?${params}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [site, category, product, page]);

  useEffect(() => { fetchData(); }, []);

  function applyFilters() { setPage(1); fetchData(1); }

  function clearFilters() {
    setSite(""); setCategory(""); setProduct("");
    setPage(1);
    setLoading(true);
    fetch("/api/price-list?page=1")
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }

  const filters = data?.filters;

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: "32px 24px", fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <AdminGuard />
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>← Home</Link>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>Price List</h1>
          {data && (
            <span style={{ marginLeft: "auto", fontSize: "13px", color: "#64748b" }}>
              {data.total.toLocaleString()} rows
            </span>
          )}
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
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</div>
            <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {filters?.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Product</div>
            <select style={{ ...selectStyle, minWidth: "180px" }} value={product} onChange={e => setProduct(e.target.value)}>
              <option value="">All products</option>
              {filters?.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button style={btnPrimary} onClick={applyFilters}>Apply</button>
          <button style={btnStyle} onClick={clearFilters}>Clear</button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "#fef2f2", color: "#991b1b", marginBottom: "16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fff", overflow: "auto", boxShadow: "0 1px 4px rgba(15,23,42,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Site</th>
                <th style={th}>Category</th>
                <th style={th}>Product</th>
                <th style={th}>Lot No.</th>
                <th style={th}>Size</th>
                <th style={{ ...th, textAlign: "right" }}>As-Need (RM)</th>
                <th style={{ ...th, textAlign: "right" }}>Pre-Need (RM)</th>
                <th style={{ ...th, textAlign: "right" }}>Trust/Facility (RM)</th>
                <th style={{ ...th, textAlign: "right" }}>Backwall (RM)</th>
                <th style={{ ...th, textAlign: "right" }}>Pre-Need Total (RM)</th>
                <th style={{ ...th, textAlign: "right" }}>Point Value (PV)</th>
                <th style={th}>WEF Date</th>
                <th style={th}>Religion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "40px" }}>Loading…</td></tr>
              ) : !data?.rows.length ? (
                <tr><td colSpan={13} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "40px" }}>No rows found.</td></tr>
              ) : data.rows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={td}>{row.site_code}</td>
                  <td style={td}>{row.product_category}</td>
                  <td style={{ ...td, fontWeight: 500 }}>{row.product_name}</td>
                  <td style={td}>{row.lot_no ?? "—"}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.size_description ?? "—"}</td>
                  <td style={tdNum}>{fmt(row.as_need_price)}</td>
                  <td style={tdNum}>{fmt(row.pre_need_price)}</td>
                  <td style={tdNum}>{fmt(row.trust_account_facility)}</td>
                  <td style={tdNum}>{fmt(row.backwall_cost)}</td>
                  <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(row.total_pre_need_price)}</td>
                  <td style={tdNum}>{fmt(row.point_value)}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.wef_date ?? "—"}</td>
                  <td style={{ ...td, color: "#64748b" }}>{row.religion_use ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px", fontSize: "13px", color: "#64748b" }}>
            <button style={btnStyle} disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}>← Prev</button>
            <span>Page {data.page} of {data.totalPages}</span>
            <button style={btnStyle} disabled={page >= data.totalPages} onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}>Next →</button>
          </div>
        )}

      </div>
    </main>
  );
}
