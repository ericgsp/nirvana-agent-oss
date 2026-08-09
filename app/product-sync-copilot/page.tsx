"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";

type Credential = { id: string; label: string; username: string; active: boolean };

const PRODUCT_TYPES = [
  "BURIAL PLOT", "NICHE", "PEDESTAL", "URN BURIAL PLOT",
  "PET BURIAL PLOT", "PET NICHE", "ETERNAL BL", "NV SEED",
];

const SITES = [
  "Semenyih", "Kota Kinabalu", "Kulai", "Sibu", "Segamat",
  "Shah Alam", "Ulu Tiram", "Penang", "Bukit Mertajam",
  "Sg. Petani", "Nckl", "Klang", "Melaka", "Ipoh",
  "Ijok", "Kuantan", "Nirvana 3", "Karak",
];

type Status = {
  chromeConnected: boolean;
  layoutReady: boolean;
  pageTitle?: string;
  error?: string;
};

type HistoryRow = {
  site: string;
  product_type: string;
  zone: string;
  section: string | null;
  discovered_at: string;
};

export default function CopilotPage() {
  const [status, setStatus]               = useState<Status | null>(null);
  const [site, setSite]                   = useState("");
  const [productType, setProductType]     = useState("");
  const [zone, setZone]                   = useState("");
  const [section, setSection]             = useState("");
  const [saving, setSaving]               = useState(false);
  const [cooldown, setCooldown]           = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [logs, setLogs]                   = useState<string[]>([]);
  const [lastResult, setLastResult]       = useState<{ ok: boolean; count?: number } | null>(null);
  const [history, setHistory]             = useState<HistoryRow[]>([]);
  const [credentials, setCredentials]     = useState<Credential[]>([]);
  const [selectedCredId, setSelectedCredId] = useState<string>("");
  const [zoneOptions, setZoneOptions]       = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [zoneManual, setZoneManual]         = useState(false);
  const [sectionManual, setSectionManual]   = useState(false);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Poll Chrome status every 3 seconds
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/product-sync/copilot?action=status");
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    pollStatus();
    pollRef.current = setInterval(pollStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [pollStatus]);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/product-sync/copilot?action=history").catch(() => null);
    if (res?.ok) setHistory((await res.json()).history ?? []);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    setZone(""); setSection(""); setZoneOptions([]); setSectionOptions([]);
    setZoneManual(false); setSectionManual(false);
    if (!site || !productType) return;
    fetch(`/api/product-sync/copilot?action=zones&site=${encodeURIComponent(site)}&productType=${encodeURIComponent(productType)}`)
      .then(r => r.json()).then(d => setZoneOptions(d.zones ?? [])).catch(() => {});
  }, [site, productType]);

  useEffect(() => {
    setSection(""); setSectionOptions([]); setSectionManual(false);
    if (!site || !productType || !zone) return;
    fetch(`/api/product-sync/copilot?action=sections&site=${encodeURIComponent(site)}&productType=${encodeURIComponent(productType)}&zone=${encodeURIComponent(zone)}`)
      .then(r => r.json()).then(d => setSectionOptions(d.sections ?? [])).catch(() => {});
  }, [site, productType, zone]);

  useEffect(() => {
    fetch("/api/nirvana-credentials")
      .then(r => r.json())
      .then(d => {
        if (d.credentials) {
          setCredentials(d.credentials);
          const first = (d.credentials as Credential[]).find(c => c.active);
          if (first) setSelectedCredId(first.id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!site || !productType || !zone) return;
    setSaving(true);
    setLogs([]);
    setLastResult(null);
    try {
      const res = await fetch("/api/product-sync/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, productType, zone, section: section || undefined }),
      });
      const data = await res.json();
      setLogs(data.logs ?? []);
      if (data.success) {
        setLastResult({ ok: true, count: data.lotsUpserted });
        setZone("");
        setSection("");
        await loadHistory();
        // Start 15-second cooldown
        setCooldown(15);
        cooldownRef.current = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        setLastResult({ ok: false });
      }
    } catch (err) {
      setLogs([`Error: ${err}`]);
      setLastResult({ ok: false });
    } finally {
      setSaving(false);
    }
  };

  const chromeOk = status?.chromeConnected;
  const layoutOk = status?.layoutReady;
  const canSave  = !!chromeOk && !!layoutOk && !!site && !!productType && !!zone && !saving && cooldown === 0;

  const [launching, setLaunching] = useState(false);
  const handleLaunch = async () => {
    setLaunching(true);
    await fetch("/api/product-sync/copilot/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential_id: selectedCredId || undefined }),
    }).catch(() => {});
    setTimeout(() => setLaunching(false), 4000);
  };

  return (
    <>
      <AdminGuard />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Product Sync Co-Pilot</h1>
        <p style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>
          You navigate the portal — co-pilot auto-downloads and saves the data.
        </p>

        {/* Step 1: Launch Portal */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Step 1 — Open the Nirvana Portal</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            Select a login account, then launch Chrome. The portal login form will be auto-filled — you just click Sign In.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Login Account</label>
              <select
                value={selectedCredId}
                onChange={e => setSelectedCredId(e.target.value)}
                disabled={!!chromeOk || launching}
                style={{ ...inputStyle, maxWidth: 300 }}
              >
                <option value="">— No auto-fill —</option>
                {credentials.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.username}){c.active ? "" : " [inactive]"}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ paddingTop: 20 }}>
              <button
                onClick={handleLaunch}
                disabled={launching || !!chromeOk}
                style={{
                  padding: "9px 20px", borderRadius: 6, border: "none", fontWeight: 600, fontSize: 14,
                  cursor: (launching || !!chromeOk) ? "not-allowed" : "pointer",
                  background: chromeOk ? "#86efac" : launching ? "#cbd5e1" : "#0f172a",
                  color: chromeOk ? "#15803d" : launching ? "#94a3b8" : "#fff",
                  whiteSpace: "nowrap",
                }}
              >
                {chromeOk ? "✓ Portal Chrome Running" : launching ? "⏳ Launching..." : "🌐 Launch Portal"}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Status */}
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Step 2 — Navigate to a zone layout in the portal</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusBadge label="Chrome" ok={!!chromeOk}
            okText="Connected (port 9222)"
            failText={status ? "Not detected — run the .bat script" : "Checking..."} />
          <StatusBadge label="Layout Page" ok={!!layoutOk}
            okText={status?.pageTitle ? `Ready — ${status.pageTitle}` : "Download button detected"}
            failText="Navigate to a zone layout grid in Chrome" />
        </div>

        {/* Form */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>Step 3 — Fill in zone details &amp; save</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Site</label>
              <select value={site} onChange={e => setSite(e.target.value)} style={inputStyle} disabled={saving}>
                <option value="">Select site...</option>
                {SITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Product Type</label>
              <select value={productType} onChange={e => setProductType(e.target.value)} style={inputStyle} disabled={saving}>
                <option value="">Select type...</option>
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Zone</label>
              {zoneOptions.length > 0 && !zoneManual ? (
                <select value={zone} onChange={e => { if (e.target.value === "__new__") { setZoneManual(true); setZone(""); } else setZone(e.target.value); }} style={inputStyle} disabled={saving}>
                  <option value="">Select zone...</option>
                  {zoneOptions.map(z => <option key={z} value={z}>{z}</option>)}
                  <option value="__new__">+ Type manually...</option>
                </select>
              ) : (
                <input autoFocus={zoneManual} value={zone}
                  onChange={e => setZone(e.target.value)}
                  placeholder={site && productType ? "Type zone name..." : "Select site & type first"}
                  style={inputStyle} disabled={saving || !site || !productType} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Section <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
              {sectionOptions.length > 0 && !sectionManual ? (
                <select value={section} onChange={e => { if (e.target.value === "__new__") { setSectionManual(true); setSection(""); } else setSection(e.target.value); }} style={inputStyle} disabled={saving}>
                  <option value="">None / all sections</option>
                  {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__new__">+ Type manually...</option>
                </select>
              ) : (
                <input autoFocus={sectionManual} value={section}
                  onChange={e => setSection(e.target.value)}
                  placeholder="Leave blank if none"
                  style={inputStyle} disabled={saving} />
              )}
            </div>
          </div>

          <button onClick={handleSave} disabled={!canSave} style={{
            marginTop: 16, padding: "10px 24px",
            background: canSave ? "#0f172a" : "#cbd5e1",
            color: canSave ? "#fff" : "#94a3b8",
            border: "none", borderRadius: 6, fontWeight: 600, fontSize: 14,
            cursor: canSave ? "pointer" : "not-allowed",
          }}>
            {saving ? "⏳ Downloading..." : cooldown > 0 ? `⏳ Wait ${cooldown}s...` : "⬇ Download & Save"}
          </button>

          {!chromeOk && <p style={{ marginTop: 8, fontSize: 13, color: "#ef4444" }}>Chrome not connected — run the .bat script first.</p>}
          {chromeOk && !layoutOk && <p style={{ marginTop: 8, fontSize: 13, color: "#f59e0b" }}>Navigate to a zone layout grid in Chrome, then click Download & Save.</p>}
        </div>

        {/* Result */}
        {lastResult && (
          <div style={{
            padding: "10px 14px", borderRadius: 6, marginBottom: 14,
            background: lastResult.ok ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${lastResult.ok ? "#86efac" : "#fca5a5"}`,
            color: lastResult.ok ? "#15803d" : "#b91c1c",
            fontWeight: 600, fontSize: 14,
          }}>
            {lastResult.ok ? `✓ Saved successfully — ${lastResult.count} lots upserted` : "✗ Save failed — see log below"}
          </div>
        )}

        {/* Log */}
        {logs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              background: "#0f172a", color: "#94a3b8", borderRadius: 6,
              padding: "10px 14px", fontFamily: "monospace", fontSize: 12,
              maxHeight: 200, overflowY: "auto", lineHeight: 1.6,
            }}>
              {logs.map((l, i) => (
                <div key={i} style={{ color: l.includes("Error") ? "#f87171" : l.includes("Saved") ? "#86efac" : "#94a3b8" }}>{l}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Recently Synced</h2>
            <button onClick={loadHistory} style={{ fontSize: 12, color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>↻ Refresh</button>
          </div>
          {history.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>No zones synced yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Site", "Type", "Zone", "Section", "Synced At"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>{row.site}</td>
                      <td style={tdStyle}>{row.product_type}</td>
                      <td style={tdStyle}>{row.zone}</td>
                      <td style={{ ...tdStyle, color: row.section ? "#0f172a" : "#94a3b8" }}>{row.section ?? "—"}</td>
                      <td style={{ ...tdStyle, color: "#64748b" }}>
                        {new Date(row.discovered_at).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}

function StatusBadge({ label, ok, okText, failText }: { label: string; ok: boolean; okText: string; failText: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 6, border: `1px solid ${ok ? "#86efac" : "#fca5a5"}`, background: ok ? "#f0fdf4" : "#fef2f2", fontSize: 13 }}>
      <span style={{ fontSize: 15 }}>{ok ? "🟢" : "🔴"}</span>
      <span><strong>{label}:</strong> <span style={{ color: ok ? "#15803d" : "#b91c1c" }}>{ok ? okText : failText}</span></span>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "#fff" };
const codeStyle:  React.CSSProperties = { background: "#e2e8f0", padding: "1px 5px", borderRadius: 3, fontSize: 12 };
const tdStyle:    React.CSSProperties = { padding: "8px 12px", color: "#0f172a" };
