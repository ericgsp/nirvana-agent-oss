"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

type AvailabilityRow = {
  id: string;
  site: string;
  product_type: string;
  zone: string;
  section: string | null;
  lot_code: string;
  available: boolean;
  synced_at: string;
};

type ApiResponse = {
  rows: AvailabilityRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: { total: number; available: number; sold: number };
  filters: { sites: string[]; productTypes: string[]; zones: string[] };
};

export default function ProductAvailabilityPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [site, setSite]               = useState("");
  const [productType, setProductType] = useState("");
  const [zone, setZone]               = useState("");
  const [available, setAvailable]     = useState("");
  const [page, setPage]               = useState(1);

  async function fetchData(opts?: { site?: string; productType?: string; zone?: string; available?: string; page?: number }) {
    setLoading(true);
    setError(null);
    const s  = opts?.site        ?? site;
    const pt = opts?.productType ?? productType;
    const z  = opts?.zone        ?? zone;
    const av = opts?.available   ?? available;
    const p  = opts?.page        ?? page;
    const params = new URLSearchParams();
    if (s)  params.set("site", s);
    if (pt) params.set("product_type", pt);
    if (z)  params.set("zone", z);
    if (av) params.set("available", av);
    params.set("page", String(p));
    try {
      const res = await fetch(`/api/product-availability?${params}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => { fetchData(); }, []);

  // Refresh dependent dropdowns when site or productType changes
  useEffect(() => {
    if (!site && !productType) return;
    fetchData({ site, productType, page: 1 });
  }, [site, productType]);

  function applyFilters() {
    fetchData({ site, productType, zone, available, page: 1 });
    setPage(1);
  }

  function clearFilters() {
    setSite(""); setProductType(""); setZone(""); setAvailable("");
    setPage(1);
    fetchData({ site: "", productType: "", zone: "", available: "", page: 1 });
  }

  function goToPage(p: number) {
    setPage(p);
    fetchData({ site, productType, zone, available, page: p });
  }

  const sites        = data?.filters.sites ?? [];
  const productTypes = data?.filters.productTypes ?? [];
  const zones        = data?.filters.zones ?? [];

  const inputStyle = {
    fontSize: "13px", padding: "7px 10px", borderRadius: "7px",
    border: "1px solid #e2e8f0", color: "#374151", background: "#fff",
    minWidth: "140px",
  };

  return (
    <main style={{
      minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: "40px 28px",
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <AdminGuard />
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "8px" }}>
          <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>← Home</Link>
        </div>
        <h1 style={{ margin: "0 0 4px", fontSize: "28px", letterSpacing: "-0.03em" }}>Product Availability</h1>
        <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: "14px" }}>
          View all lot codes synced from the Nirvana portal, with their available / unavailable status.
        </p>

        {/* Summary cards */}
        {data?.summary && (
          <div style={{ display: "flex", gap: "14px", marginBottom: "24px", flexWrap: "wrap" }}>
            {[
              { label: "Total lots (filtered)", value: data.summary.total.toLocaleString(), color: "#0f172a" },
              { label: "Available",             value: data.summary.available.toLocaleString(), color: "#16a34a" },
              { label: "Unavailable",            value: data.summary.sold.toLocaleString(),      color: "#dc2626" },
              { label: "Availability rate",
                value: data.summary.total > 0
                  ? `${Math.round((data.summary.available / data.summary.total) * 100)}%`
                  : "—",
                color: "#2563eb" },
            ].map(card => (
              <div key={card.label} style={{
                background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px",
                padding: "16px 20px", minWidth: "160px", flex: "1",
                boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
              }}>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{card.label}</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px",
          padding: "18px 20px", marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>

            <div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 500 }}>SITE</div>
              <select value={site} onChange={e => { setSite(e.target.value); setProductType(""); setZone(""); }} style={inputStyle}>
                <option value="">All sites</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 500 }}>PRODUCT TYPE</div>
              <select value={productType} onChange={e => { setProductType(e.target.value); setZone(""); }} style={inputStyle}>
                <option value="">All types</option>
                {productTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 500 }}>ZONE</div>
              <select value={zone} onChange={e => setZone(e.target.value)} style={inputStyle}>
                <option value="">All zones</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", fontWeight: 500 }}>STATUS</div>
              <select value={available} onChange={e => setAvailable(e.target.value)} style={inputStyle}>
                <option value="">All</option>
                <option value="true">Available only</option>
                <option value="false">Unavailable only</option>
              </select>
            </div>

            <button onClick={applyFilters} style={{
              padding: "8px 20px", borderRadius: "8px", border: "none", fontWeight: 600,
              fontSize: "13px", background: "#2563eb", color: "#fff", cursor: "pointer",
            }}>
              Apply
            </button>

            <button onClick={clearFilters} style={{
              padding: "8px 14px", borderRadius: "8px", fontSize: "13px",
              border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer",
            }}>
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px",
          padding: "0", overflow: "hidden",
          boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
        }}>

          {/* Table header bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
          }}>
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              {loading ? "Loading…" : data
                ? `Showing ${((data.page - 1) * data.pageSize) + 1}–${Math.min(data.page * data.pageSize, data.total)} of ${data.total.toLocaleString()} lots`
                : ""}
            </span>
            <button onClick={() => fetchData()} style={{
              fontSize: "12px", color: "#64748b", background: "none",
              border: "1px solid #e2e8f0", borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
            }}>
              Refresh
            </button>
          </div>

          {error ? (
            <div style={{ padding: "20px", color: "#dc2626", fontSize: "14px" }}>Error: {error}</div>
          ) : loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>Loading…</div>
          ) : !data || data.rows.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
              No records found. Adjust filters or sync products first.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {["Site", "Product Type", "Zone", "Section", "Lot Code", "Status", "Last Synced"].map(h => (
                      <th key={h} style={{
                        textAlign: "left", padding: "10px 14px",
                        color: "#64748b", fontWeight: 500, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(row => (
                    <tr key={row.id} style={{
                      borderBottom: "1px solid #f8fafc",
                      background: row.available ? "transparent" : "#fafafa",
                    }}>
                      <td style={{ padding: "9px 14px" }}>{row.site}</td>
                      <td style={{ padding: "9px 14px", color: "#374151" }}>{row.product_type}</td>
                      <td style={{ padding: "9px 14px", color: "#374151" }}>{row.zone}</td>
                      <td style={{ padding: "9px 14px", color: "#94a3b8" }}>{row.section ?? "—"}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.02em" }}>
                        {row.lot_code}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{
                          display: "inline-block", padding: "2px 10px", borderRadius: "99px",
                          fontSize: "11px", fontWeight: 600,
                          color: row.available ? "#166534" : "#6b7280",
                          background: row.available ? "#dcfce7" : "#f3f4f6",
                        }}>
                          {row.available ? "Available" : "Unavailable"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 14px", color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {new Date(row.synced_at).toLocaleDateString()} {new Date(row.synced_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "center",
              gap: "6px", padding: "16px 20px", borderTop: "1px solid #f1f5f9",
            }}>
              <button
                onClick={() => goToPage(data.page - 1)}
                disabled={data.page <= 1}
                style={{
                  padding: "6px 12px", borderRadius: "7px", fontSize: "13px",
                  border: "1px solid #e2e8f0", background: "#fff", cursor: data.page <= 1 ? "not-allowed" : "pointer",
                  color: data.page <= 1 ? "#cbd5e1" : "#374151",
                }}>
                ← Prev
              </button>

              {/* Page number buttons — show up to 7 around current */}
              {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === data.totalPages || Math.abs(p - data.page) <= 2)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "#94a3b8" }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p as number)}
                      style={{
                        padding: "6px 11px", borderRadius: "7px", fontSize: "13px", border: "1px solid",
                        borderColor: p === data.page ? "#2563eb" : "#e2e8f0",
                        background: p === data.page ? "#2563eb" : "#fff",
                        color: p === data.page ? "#fff" : "#374151",
                        fontWeight: p === data.page ? 600 : 400,
                        cursor: "pointer",
                      }}>
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => goToPage(data.page + 1)}
                disabled={data.page >= data.totalPages}
                style={{
                  padding: "6px 12px", borderRadius: "7px", fontSize: "13px",
                  border: "1px solid #e2e8f0", background: "#fff",
                  cursor: data.page >= data.totalPages ? "not-allowed" : "pointer",
                  color: data.page >= data.totalPages ? "#cbd5e1" : "#374151",
                }}>
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
