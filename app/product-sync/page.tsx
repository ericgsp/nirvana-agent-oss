"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

// ── Types ────────────────────────────────────────────────────────────────────

type SyncJob = {
  job_id: string;
  site: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  files_downloaded: number | null;
  products_upserted: number | null;
  error_message: string | null;
};

type NirvanaCredential = {
  id: string;
  label: string;
  active: boolean;
};

type DiscoveryRow = {
  id: string;
  site: string;
  product_type: string;
  zone: string;
  section: string | null;
  discovered_at: string;
  download_status: "downloading" | "success" | "failed" | null;
  download_error: string | null;
  downloaded_at: string | null;
  products_found: number | null;
  products_available: number | null;
};

type SiteStats = Record<string, { total: number; available: number }>;
type AllStats = Record<string, SiteStats>;

type DiscoveryItem = {
  site: string;
  product_type: string;
  status: "idle" | "probing" | "discovering" | "done" | "failed";
  saved: number;
  error?: string;
  logLines: string[];
};

// ── Constants ────────────────────────────────────────────────────────────────

const KNOWN_SITES = [
  "Semenyih", "Nckl", "Klang", "Shah Alam", "Ipoh",
  "Kuantan", "Karak", "Nirvana 3", "Ijok",
];

const STATUS_COLOR: Record<string, string> = {
  running: "#f59e0b",
  completed: "#22c55e",
  failed: "#ef4444",
};

const DL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  downloading: { label: "Downloading…", color: "#1d4ed8", bg: "#dbeafe" },
  success:     { label: "Success",       color: "#166534", bg: "#dcfce7" },
  failed:      { label: "Failed",        color: "#991b1b", bg: "#fee2e2" },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ProductSyncPage() {
  // Discovery/sync state
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [activeSite, setActiveSite] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Discovery table state
  const [discoverySite, setDiscoverySite] = useState<string>("Semenyih");
  const [allDiscoveryRows, setAllDiscoveryRows] = useState<DiscoveryRow[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Track which rows are currently being downloaded (in-progress)
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [activeLog, setActiveLog] = useState<{ id: string; lines: string[] } | null>(null);
  const activeLogRef = useRef<HTMLDivElement>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const stopRequestedRef = useRef(false);
  const [sessionCap, setSessionCap] = useState<number>(5);

  // Credentials
  const [credentials, setCredentials] = useState<NirvanaCredential[]>([]);
  const [activeCredentialId, setActiveCredentialId] = useState<string | null>(null);
  const [selectedBulkCredentialId, setSelectedBulkCredentialId] = useState<string | null>(null);

  // Per-product-type discovery state
  const [discoverSite, setDiscoverSite] = useState<string>("Semenyih");
  const [discoverItems, setDiscoverItems] = useState<DiscoveryItem[]>([]);
  const [probing, setProbing] = useState(false);
  const [discoverRunning, setDiscoverRunning] = useState(false);

  // Credential rotation state for manual one-by-one Re-download
  const rotationRef = useRef<{ credId: string | null; remaining: number }>({ credId: null, remaining: 0 });

  function pickRotatingCredential(): string | undefined {
    const active = credentials.filter(c => c.active);
    if (active.length === 0) return undefined;
    const rot = rotationRef.current;
    if (rot.remaining <= 0 || !rot.credId) {
      // Pick a new random credential (different from current if possible)
      const others = active.filter(c => c.id !== rot.credId);
      const pool = others.length > 0 ? others : active;
      const next = pool[Math.floor(Math.random() * pool.length)];
      rot.credId = next.id;
      rot.remaining = Math.floor(Math.random() * 8) + 1; // 1–8 uses before next switch
    }
    rot.remaining--;
    return rot.credId;
  }

  // Table filters
  const [tableSearch, setTableSearch] = useState("");
  const [hideZeroAvail, setHideZeroAvail] = useState(false);

  // Stats
  const [dbStats, setDbStats] = useState<AllStats>({});

  // Job history
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { activeLogRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeLog]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchJobs();
    fetchStats();
    fetchAllDiscovery();
    fetchCredentials();
    const id = setInterval(() => { fetchStats(); }, 15000);
    return () => clearInterval(id);
  }, []);

  // ── Fetchers ───────────────────────────────────────────────────────────────
  async function fetchJobs() {
    setLoadingJobs(true);
    try {
      const res = await fetch("/api/product-sync");
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
    } finally { setLoadingJobs(false); }
  }

  async function fetchCredentials() {
    try {
      const res = await fetch("/api/nirvana-credentials");
      const data = await res.json();
      if (data.credentials) setCredentials(data.credentials);
    } catch { /* silent */ }
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/product-sync?stats=1");
      const data = await res.json();
      if (data.stats) setDbStats(data.stats);
    } catch { /* silent */ }
  }

  const fetchDiscovery = useCallback(async (site: string) => {
    try {
      const res = await fetch(`/api/product-sync/discovery?site=${encodeURIComponent(site)}`);
      const data = await res.json();
      if (data.rows) {
        setAllDiscoveryRows(prev => {
          const without = prev.filter(r => r.site !== site);
          return [...without, ...data.rows];
        });
      }
    } catch { /* silent */ }
  }, []);

  const fetchAllDiscovery = useCallback(async () => {
    setLoadingDiscovery(true);
    try {
      const results = await Promise.all(
        KNOWN_SITES.map(s =>
          fetch(`/api/product-sync/discovery?site=${encodeURIComponent(s)}`)
            .then(r => r.json())
            .then(d => (d.rows ?? []) as DiscoveryRow[])
            .catch(() => [] as DiscoveryRow[])
        )
      );
      setAllDiscoveryRows(results.flat());
    } finally { setLoadingDiscovery(false); }
  }, []);

  // ── Discovery (scrape) ────────────────────────────────────────────────────
  function toggleSite(site: string) {
    setSelectedSites(prev =>
      prev.includes(site) ? prev.filter(s => s !== site) : [...prev, site]
    );
  }

  async function runDiscover() {
    if (selectedSites.length === 0 || syncing) return;
    setSyncing(true);
    setLogs([]);

    for (const site of selectedSites) {
      setActiveSite(site);
      setLogs(prev => [...prev, `▶ Starting discovery for: ${site}`]);

      try {
        const res = await fetch("/api/product-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site }),
        });
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "log") setLogs(prev => [...prev, event.message]);
              else if (event.type === "error") setLogs(prev => [...prev, `✗ ${site}: ${event.message}`]);
              else if (event.type === "result") setLogs(prev => [...prev, `✓ ${site}: Discovery complete`]);
            } catch { /* ignore malformed */ }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLogs(prev => [...prev, `✗ ${site}: ${msg}`]);
      }
    }

    setActiveSite(null);
    setSyncing(false);
    // Refresh discovery rows for all sites that were just discovered
    await Promise.all(selectedSites.map(s => fetchDiscovery(s)));
    if (selectedSites[0]) setDiscoverySite(selectedSites[0]);
    await fetchJobs();
  }

  // ── Per-product-type discovery ────────────────────────────────────────────

  async function probeProductTypes() {
    if (probing || discoverRunning) return;
    setProbing(true);
    setDiscoverItems([]);
    const credId = selectedBulkCredentialId ?? credentials.find(c => c.active)?.id ?? undefined;
    try {
      const res = await fetch("/api/product-sync/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: discoverSite, credential_id: credId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const types: string[] = data.productTypes ?? [];
      setDiscoverItems(types.map(pt => ({
        site: discoverSite, product_type: pt,
        status: "idle", saved: 0, logLines: [],
      })));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs(prev => [...prev, `✗ Probe failed: ${msg}`]);
    } finally {
      setProbing(false);
    }
  }

  async function discoverOneItem(item: DiscoveryItem) {
    const credId = selectedBulkCredentialId ?? credentials.find(c => c.active)?.id ?? undefined;
    setDiscoverItems(prev => prev.map(i =>
      i.site === item.site && i.product_type === item.product_type
        ? { ...i, status: "discovering", logLines: [], error: undefined }
        : i
    ));
    try {
      const res = await fetch("/api/product-sync/discover-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: item.site, product_type: item.product_type, credential_id: credId }),
      });
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "log") {
              setDiscoverItems(prev => prev.map(i =>
                i.site === item.site && i.product_type === item.product_type
                  ? { ...i, logLines: [...i.logLines, event.message] }
                  : i
              ));
            } else if (event.type === "done") {
              if (event.status === "success") {
                setDiscoverItems(prev => prev.map(i =>
                  i.site === item.site && i.product_type === item.product_type
                    ? { ...i, status: "done", saved: event.saved }
                    : i
                ));
                await fetchDiscovery(item.site);
              } else {
                setDiscoverItems(prev => prev.map(i =>
                  i.site === item.site && i.product_type === item.product_type
                    ? { ...i, status: "failed", error: event.error }
                    : i
                ));
              }
            }
          } catch { /* ignore malformed */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDiscoverItems(prev => prev.map(i =>
        i.site === item.site && i.product_type === item.product_type
          ? { ...i, status: "failed", error: msg }
          : i
      ));
    }
  }

  async function discoverAllItems() {
    if (discoverRunning) return;
    setDiscoverRunning(true);
    for (const item of discoverItems) {
      if (item.status === "done") continue;
      await discoverOneItem(item);
    }
    setDiscoverRunning(false);
  }

  // ── Individual download (via GitHub Actions) ─────────────────────────────
  async function downloadRow(row: DiscoveryRow, credentialId?: string) {
    if (downloadingIds.has(row.id)) return;

    setDownloadingIds(prev => new Set(prev).add(row.id));
    setActiveCredentialId(credentialId ?? null);
    setAllDiscoveryRows(prev =>
      prev.map(r => r.id === row.id ? { ...r, download_status: "downloading" } : r)
    );

    try {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if (isLocal) {
        // Run directly via local API (Playwright on this machine) — read SSE stream
        setActiveLog({ id: row.id, lines: [`▶ Starting download: ${row.site} / ${row.product_type} / ${row.zone ?? "all"}`] });
        const res = await fetch("/api/product-sync/download-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, site: row.site, zone: row.zone, product_type: row.product_type, credential_id: credentialId }),
        });
        if (!res.body) throw new Error("No response stream");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          buffer += decoder.decode(value ?? new Uint8Array(), { stream: !streamDone });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.replace(/^data: /, "").trim();
            if (!line) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === "log") setActiveLog(prev => prev ? { ...prev, lines: [...prev.lines, event.message] } : { id: row.id, lines: [event.message] });
              if (event.type === "done") {
                if (event.status === "success") {
                  setActiveLog(prev => prev ? { ...prev, lines: [...prev.lines, `✓ Done — ${event.available} available / ${event.total} total`] } : prev);
                  setAllDiscoveryRows(prev =>
                    prev.map(r => r.id === row.id ? { ...r, download_status: "success", downloaded_at: new Date().toISOString(), products_available: event.available, products_found: event.total } : r)
                  );
                } else {
                  throw new Error(event.error ?? "Download failed");
                }
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } else {
        // Trigger GitHub Actions workflow (production)
        const triggerRes = await fetch("/api/product-sync/github-trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site: row.site, zone: row.zone, product_type: row.product_type }),
        });
        const { run_id, error: triggerErr } = await triggerRes.json();
        if (triggerErr) throw new Error(triggerErr);
        if (!run_id) throw new Error("Could not get run ID from GitHub");

        // Poll every 10s until completed
        let attempts = 0;
        const maxAttempts = 60; // 10 min max
        while (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 10000));
          attempts++;

          const statusRes = await fetch(`/api/product-sync/github-trigger?run_id=${run_id}`);
          const { status, conclusion } = await statusRes.json();

          if (status === "completed") {
            if (conclusion === "success") {
              setAllDiscoveryRows(prev =>
                prev.map(r =>
                  r.id === row.id
                    ? { ...r, download_status: "success", downloaded_at: new Date().toISOString() }
                    : r
                )
              );
            } else {
              setAllDiscoveryRows(prev =>
                prev.map(r =>
                  r.id === row.id
                    ? { ...r, download_status: "failed", download_error: `GitHub Actions run ${conclusion}` }
                    : r
                )
              );
            }
            break;
          }
        }

        if (attempts >= maxAttempts) {
          setAllDiscoveryRows(prev =>
            prev.map(r =>
              r.id === row.id ? { ...r, download_status: "failed", download_error: "Timed out waiting for GitHub Actions" } : r
            )
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAllDiscoveryRows(prev =>
        prev.map(r =>
          r.id === row.id ? { ...r, download_status: "failed", download_error: msg } : r
        )
      );
    } finally {
      setDownloadingIds(prev => { const s = new Set(prev); s.delete(row.id); return s; });
      setActiveCredentialId(null);
      fetchStats();
    }
  }

  // ── Co-pilot download ──────────────────────────────────────────────────────
  // ── Batch download ─────────────────────────────────────────────────────────
  async function downloadSelected() {
    // Shuffle all selected items randomly across all sites
    const toDownload = allDiscoveryRows
      .filter(r => selectedIds.has(r.id) && !downloadingIds.has(r.id))
      .sort(() => Math.random() - 0.5);

    if (toDownload.length === 0) return;

    stopRequestedRef.current = false;
    setBulkRunning(true);

    // Build credential pool — rotate across all active credentials one at a time.
    // Never run more than one browser session simultaneously; the portal blocks
    // concurrent sessions as bot activity.
    const allActive = credentials.filter(c => c.active);
    const credPool = selectedBulkCredentialId
      ? [credentials.find(c => c.id === selectedBulkCredentialId) ?? allActive[0] ?? { id: "", label: "Default", active: true }]
      : allActive.length > 0
        ? [...allActive].sort(() => Math.random() - 0.5)  // randomise starting order
        : [{ id: "", label: "Default", active: true }];

    // Apply per-session cap across the whole pool (not per credential).
    const sessionItems = toDownload.slice(0, sessionCap);

    setLogs(prev => [...prev,
      `▶ Starting download — ${sessionItems.length} of ${toDownload.length} item(s) — rotating across ${credPool.length} credential(s): ${credPool.map(c => c.label).join(", ")}`
    ]);
    setLogs(prev => [...prev,
      `  Session cap: ${sessionCap} item(s) total — 1 browser at a time, credentials rotate per item`
    ]);

    // Single sequential loop — one download at a time, rotating credentials.
    for (let i = 0; i < sessionItems.length; i++) {
      if (stopRequestedRef.current) break;
      const cred = credPool[i % credPool.length];
      setLogs(prev => [...prev, `  [${cred.label}] downloading item ${i + 1}/${sessionItems.length}…`]);
      await downloadRow(sessionItems[i], cred.id || undefined);
      if (i < sessionItems.length - 1 && !stopRequestedRef.current) {
        const delayMs = (3 + Math.random() * 7) * 60000;  // 3–10 min between items
        const delaySecs = Math.round(delayMs / 1000);
        setLogs(prev => [...prev, `  ⏱ next item in ${delaySecs}s…`]);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    if (stopRequestedRef.current) {
      setLogs(prev => [...prev, `⏹ Stopped by user.`]);
    }

    await fetchStats();

    // ── Retry pass (skipped if user stopped) ──────────────────────────────────
    const currentRows = await new Promise<DiscoveryRow[]>(resolve => {
      setAllDiscoveryRows(prev => { resolve(prev); return prev; });
    });
    const selectedIdSet = new Set(toDownload.map(r => r.id));
    const failed = stopRequestedRef.current
      ? []
      : currentRows.filter(r => selectedIdSet.has(r.id) && r.download_status === "failed");

    if (failed.length > 0) {
      setLogs(prev => [...prev, `⟳ ${failed.length} item(s) failed — retrying after 30s pause…`]);
      await new Promise(r => setTimeout(r, 30000));

      // Retry: shuffle failed items and split across all active credentials again
      const shuffledFailed = [...failed].sort(() => Math.random() - 0.5);
      const retryQueues: DiscoveryRow[][] = activeCredentials.map(() => []);
      shuffledFailed.forEach((item, idx) => retryQueues[idx % workerCount].push(item));

      await Promise.all(activeCredentials.map(async (cred, wi) => {
        const queue = retryQueues[wi];
        if (queue.length === 0) return;
        const startDelay = wi === 0 ? Math.random() * 60000 : (wi * 3 + Math.random() * 4) * 60000;
        if (startDelay > 0) await new Promise(r => setTimeout(r, startDelay));
        setLogs(prev => [...prev, `⟳ [${cred.label}] retrying ${queue.length} item(s)`]);
        for (let i = 0; i < queue.length; i++) {
          await downloadRow(queue[i], cred.id || undefined);
          if (i < queue.length - 1) {
            const delayMs = (3 + Math.random() * 7) * 60000;
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }));

      const finalRows = await new Promise<DiscoveryRow[]>(resolve => {
        setAllDiscoveryRows(prev => { resolve(prev); return prev; });
      });
      const stillFailed = finalRows.filter(r => selectedIdSet.has(r.id) && r.download_status === "failed");
      if (stillFailed.length > 0) {
        setLogs(prev => [...prev, `✗ ${stillFailed.length} item(s) still failed after retry.`]);
      } else {
        setLogs(prev => [...prev, `✓ All retries succeeded.`]);
      }
    }

    if (!stopRequestedRef.current) {
      setLogs(prev => [...prev, `✓ Run complete — ${toDownload.length} items processed`]);
    }
    setBulkRunning(false);
  }

  // ── Select helpers ─────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function selectAll() {
    const eligible = allDiscoveryRows
      .filter(r => r.site === discoverySite && r.download_status !== "success")
      .map(r => r.id);
    setSelectedIds(prev => {
      const s = new Set(prev);
      eligible.forEach(id => s.add(id));
      return s;
    });
  }

  function selectAllSites() {
    const eligible = allDiscoveryRows
      .filter(r => r.download_status !== "success")
      .map(r => r.id);
    setSelectedIds(new Set(eligible));
  }

  function clearSelection() { setSelectedIds(new Set()); }

  async function resetStuck() {
    await fetch("/api/product-sync/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_stuck" }),
    });
    await fetchAllDiscovery();
    setLogs(prev => [...prev, "↺ Stuck downloads reset to pending."]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const discoveryRows = allDiscoveryRows.filter(r => r.site === discoverySite);
  const pendingCount = selectedIds.size;
  const successCount = allDiscoveryRows.filter(r => r.download_status === "success").length;
  const totalCount = allDiscoveryRows.length;
  const workerCount = selectedBulkCredentialId ? 1 : Math.max(1, credentials.filter(c => c.active).length);

  return (
    <main style={{
      minHeight: "100vh", background: "#f8fafc", color: "#0f172a",
      padding: "40px 28px",
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <AdminGuard />
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "8px" }}>
          <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>← Home</Link>
        </div>
        <h1 style={{ margin: "0 0 4px", fontSize: "28px", letterSpacing: "-0.03em" }}>Product Sync</h1>
        <p style={{ margin: "0 0 32px", color: "#64748b", fontSize: "14px" }}>
          Step 1: Run discovery to map all zones. Step 2: Select rows and download Excel files individually.
        </p>

        {/* ── Step 1: Discovery ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 12px rgba(15,23,42,0.05)" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 600 }}>Step 1 — Run Discovery</h2>
          <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
            Probe the portal to get the product type list, then discover zones and sections one product type at a time. Each runs in its own browser session — if one fails the others are not affected.
          </p>

          {/* Site selector + Probe button */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
            <select
              value={discoverSite}
              onChange={e => { setDiscoverSite(e.target.value); setDiscoverItems([]); }}
              disabled={probing || discoverRunning}
              style={{ fontSize: "13px", padding: "7px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", color: "#374151", background: "#fff" }}>
              {KNOWN_SITES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={probeProductTypes} disabled={probing || discoverRunning}
              style={{
                padding: "7px 18px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px",
                background: probing || discoverRunning ? "#94a3b8" : "#2563eb",
                color: "#fff", cursor: probing || discoverRunning ? "not-allowed" : "pointer",
              }}>
              {probing ? "Scanning…" : "Scan product types"}
            </button>
            {probing && <span style={{ fontSize: "12px", color: "#64748b" }}>Logging in and reading product type list…</span>}
          </div>

          {/* Per-product-type discovery items */}
          {discoverItems.length > 0 && (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", marginBottom: "12px" }}>
              {discoverItems.map(item => {
                const statusStyle: Record<string, { color: string; bg: string; label: string }> = {
                  idle:        { color: "#64748b", bg: "#f8fafc",  label: "Pending" },
                  discovering: { color: "#1d4ed8", bg: "#dbeafe",  label: "Discovering…" },
                  done:        { color: "#166534", bg: "#dcfce7",  label: `Done — ${item.saved} new` },
                  failed:      { color: "#991b1b", bg: "#fee2e2",  label: "Failed" },
                  probing:     { color: "#92400e", bg: "#fefce8",  label: "Probing…" },
                };
                const s = statusStyle[item.status];
                return (
                  <div key={item.product_type} style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: 600, fontSize: "13px", minWidth: "120px" }}>{item.product_type}</span>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: s.bg, color: s.color }}>{s.label}</span>
                      {item.error && <span style={{ fontSize: "11px", color: "#ef4444", flex: 1 }}>{item.error}</span>}
                      <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => discoverOneItem(item)}
                          disabled={item.status === "discovering" || discoverRunning}
                          style={{
                            fontSize: "12px", padding: "4px 12px", borderRadius: "6px", border: "none",
                            background: item.status === "discovering" ? "#94a3b8" : item.status === "done" ? "#f0fdf4" : "#2563eb",
                            color: item.status === "done" ? "#166534" : "#fff",
                            cursor: item.status === "discovering" || discoverRunning ? "not-allowed" : "pointer",
                            fontWeight: 600,
                          }}>
                          {item.status === "done" ? "Re-discover" : item.status === "discovering" ? "Running…" : "Discover"}
                        </button>
                      </div>
                    </div>
                    {item.logLines.length > 0 && (
                      <div style={{ marginTop: "6px", background: "#0f172a", borderRadius: "6px", padding: "8px 10px", fontFamily: "monospace", fontSize: "11px", maxHeight: "100px", overflowY: "auto" }}>
                        {item.logLines.slice(-20).map((l, i) => (
                          <div key={i} style={{ color: l.includes("✔") ? "#4ade80" : l.includes("✗") ? "#f87171" : "#94a3b8", lineHeight: 1.5 }}>{l}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {discoverItems.length > 1 && (
            <button onClick={discoverAllItems} disabled={discoverRunning || probing}
              style={{
                padding: "8px 20px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px",
                background: discoverRunning || probing ? "#94a3b8" : "#0f172a",
                color: "#fff", cursor: discoverRunning || probing ? "not-allowed" : "pointer",
              }}>
              {discoverRunning ? "Discovering…" : "Discover all (one at a time)"}
            </button>
          )}
        </div>

        {/* Live discovery log */}
        {(syncing || logs.length > 0) && (  // logs also populated during local downloads
          <div style={{
            background: "#0f172a", borderRadius: "12px", padding: "20px", marginBottom: "24px",
            fontFamily: "monospace", fontSize: "12px", maxHeight: "300px", overflowY: "auto",
          }}>
            {syncing && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#60a5fa", marginBottom: "10px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <Spinner /> Discovering {activeSite} — please wait…
              </div>
            )}
            {logs.map((line, i) => (
              <div key={i} style={{
                marginBottom: "3px", lineHeight: 1.5,
                color: line.startsWith("✓") ? "#4ade80" : line.startsWith("✗") ? "#f87171" : line.startsWith("▶") ? "#93c5fd" : "#94a3b8",
              }}>{line}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {/* ── Credentials panel ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px 24px", marginBottom: "24px", boxShadow: "0 4px 12px rgba(15,23,42,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Download Accounts</h2>
              <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                {credentials.filter(c => c.active).length > 0
                  ? selectedBulkCredentialId
                    ? `Single mode: ${credentials.find(c => c.id === selectedBulkCredentialId)?.label ?? "—"} only — click to deselect for split mode`
                    : `Split mode: all ${credentials.filter(c => c.active).length} active accounts share the download equally`
                  : "No credentials — using default .env account"}
              </p>
            </div>
            <a href="/nirvana-credentials" style={{ fontSize: "12px", color: "#64748b", textDecoration: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "5px 12px" }}>
              Manage
            </a>
          </div>
          {credentials.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>No agent accounts added yet. Add credentials to enable parallel downloads.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {credentials.map(c => {
                const isUsing = activeCredentialId === c.id;
                const isSelected = selectedBulkCredentialId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => c.active && setSelectedBulkCredentialId(isSelected ? null : c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 500,
                      cursor: c.active ? "pointer" : "default",
                      background: isUsing ? "#fefce8" : isSelected ? "#eff6ff" : c.active ? "#f0fdf4" : "#f8fafc",
                      border: `2px solid ${isUsing ? "#fde047" : isSelected ? "#3b82f6" : c.active ? "#bbf7d0" : "#e2e8f0"}`,
                      color: isUsing ? "#854d0e" : isSelected ? "#1d4ed8" : c.active ? "#15803d" : "#94a3b8",
                      transition: "all 0.2s",
                    }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isUsing ? "#eab308" : isSelected ? "#3b82f6" : c.active ? "#16a34a" : "#cbd5e1", display: "inline-block" }} />
                    {c.label}{isSelected ? " ✓ selected" : ""}{isUsing ? " ⬅ in use" : ""}
                  </div>
                );
              })}
            </div>
          )}
          {credentials.filter(c => c.active).length > 0 && !selectedBulkCredentialId && (
            <p style={{ fontSize: "11px", color: "#94a3b8", margin: "8px 0 0" }}>Split mode — all active accounts run in parallel, each handling an equal share. Click one to switch to single-account mode.</p>
          )}
        </div>

        {/* Active download log panel — shown above the table so it's visible while scrolling */}
        {activeLog && activeLog.lines.length > 0 && (
          <div style={{ background: "#0f172a", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px", fontFamily: "monospace", fontSize: "12px", maxHeight: "200px", overflowY: "auto" }}>
            <div style={{ color: "#60a5fa", marginBottom: "8px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Download log
            </div>
            {activeLog.lines.map((line, i) => (
              <div key={i} style={{ color: "#94a3b8", marginBottom: "2px", lineHeight: 1.5 }}>{line}</div>
            ))}
            <div ref={activeLogRef} />
          </div>
        )}

        {/* ── Step 2: Download table ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 12px rgba(15,23,42,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600 }}>Step 2 — Select &amp; Download</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                {totalCount > 0
                  ? `${totalCount} combinations across all sites · ${successCount} downloaded`
                  : "Run discovery first to populate this table."}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Site filter */}
              <select
                value={discoverySite}
                onChange={e => setDiscoverySite(e.target.value)}
                style={{ fontSize: "13px", padding: "6px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", color: "#374151", background: "#fff" }}
              >
                {KNOWN_SITES.map(s => {
                  const siteSelected = allDiscoveryRows.filter(r => r.site === s && selectedIds.has(r.id)).length;
                  const siteTotal = allDiscoveryRows.filter(r => r.site === s).length;
                  return <option key={s} value={s}>{s}{siteTotal > 0 ? ` (${siteSelected}/${siteTotal})` : ""}</option>;
                })}
              </select>

              <button onClick={fetchAllDiscovery}
                style={{ fontSize: "12px", color: "#64748b", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>
                Refresh
              </button>
              {allDiscoveryRows.some(r => r.download_status === "downloading") && (
                <button onClick={resetStuck}
                  style={{ fontSize: "12px", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
                  ↺ Reset stuck
                </button>
              )}

              {totalCount > 0 && (
                <>
                  <button onClick={selectAll}
                    style={{ fontSize: "12px", color: "#64748b", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>
                    Select this site
                  </button>
                  <button onClick={selectAllSites}
                    style={{ fontSize: "12px", color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
                    Select all sites
                  </button>
                  <button onClick={clearSelection}
                    style={{ fontSize: "12px", color: "#64748b", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>
                    Clear
                  </button>
                  {bulkRunning ? (
                    <button onClick={() => { stopRequestedRef.current = true; setLogs(prev => [...prev, `⏹ Stop requested — finishing current item…`]); }}
                      style={{ fontSize: "13px", fontWeight: 600, color: "#fff", background: "#dc2626", border: "none", borderRadius: "7px", padding: "7px 16px", cursor: "pointer" }}>
                      ⏹ Stop
                    </button>
                  ) : pendingCount > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                        <span>Cap:</span>
                        <select
                          value={sessionCap}
                          onChange={e => setSessionCap(Number(e.target.value))}
                          style={{ fontSize: "12px", padding: "4px 6px", borderRadius: "6px", border: "1px solid #e2e8f0", color: "#374151", background: "#fff" }}>
                          {[1,2,3,4,5,6,7,8,10].map(n => (
                            <option key={n} value={n}>{n} per agent</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={downloadSelected}
                        style={{ fontSize: "13px", fontWeight: 600, color: "#fff", background: "#2563eb", border: "none", borderRadius: "7px", padding: "7px 16px", cursor: "pointer" }}>
                        Download {Math.min(pendingCount, workerCount * sessionCap)} today
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Table filters */}
          {discoveryRows.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search product type, zone, section…"
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                style={{ flex: 1, minWidth: "200px", fontSize: "13px", padding: "6px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", color: "#374151", outline: "none" }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#374151", cursor: "pointer", whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  checked={hideZeroAvail}
                  onChange={e => setHideZeroAvail(e.target.checked)}
                  style={{ width: "14px", height: "14px", accentColor: "#2563eb" }}
                />
                Hide 0 available
              </label>
            </div>
          )}

          {loadingDiscovery ? (
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>Loading all sites…</p>
          ) : discoveryRows.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>No discovery data for {discoverySite}. Run Step 1 first.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["", "Product Type", "Zone", "Section", "Available / Total", "Status", "Action"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {discoveryRows.filter(row => {
                    if (hideZeroAvail && row.products_available === 0) return false;
                    if (tableSearch) {
                      const q = tableSearch.toLowerCase();
                      return (row.product_type ?? "").toLowerCase().includes(q)
                        || (row.zone ?? "").toLowerCase().includes(q)
                        || (row.section ?? "").toLowerCase().includes(q);
                    }
                    return true;
                  }).map(row => {
                    const isDownloading = downloadingIds.has(row.id) || row.download_status === "downloading";
                    const isDone = row.download_status === "success";
                    const isFailed = row.download_status === "failed";
                    const isSelected = selectedIds.has(row.id);
                    const statusInfo = row.download_status ? DL_STATUS[row.download_status] : null;

                    return (
                      <tr key={row.id} style={{
                        borderBottom: "1px solid #f8fafc",
                        background: isDownloading ? "#fefce8" : isDone ? "#f0fdf4" : isSelected ? "#f0f9ff" : "transparent",
                      }}>
                        {/* Checkbox */}
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDownloading}
                            onChange={() => !isDownloading && toggleSelect(row.id)}
                            style={{ width: "15px", height: "15px", cursor: isDownloading ? "default" : "pointer", accentColor: "#2563eb" }}
                          />
                        </td>

                        {/* Product / Zone / Section */}
                        <td style={{ padding: "8px 10px", fontWeight: 500 }}>{row.product_type}</td>
                        <td style={{ padding: "8px 10px", color: "#374151" }}>{row.zone}</td>
                        <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{row.section ?? "—"}</td>

                        {/* Available / Total */}
                        <td style={{ padding: "8px 10px" }}>
                          {row.products_found != null ? (
                            <span>
                              <span style={{
                                fontWeight: 600,
                                color: row.products_available == null ? "#94a3b8"
                                  : row.products_available === 0 ? "#dc2626"
                                  : "#16a34a",
                              }}>
                                {row.products_available ?? "?"}
                              </span>
                              <span style={{ color: "#94a3b8" }}>
                                /{row.products_found}
                              </span>
                            </span>
                          ) : "—"}
                        </td>

                        {/* Status + last downloaded date */}
                        <td style={{ padding: "8px 10px" }}>
                          {statusInfo ? (
                            <div>
                              <span style={{
                                display: "inline-block", padding: "2px 8px", borderRadius: "99px",
                                fontSize: "11px", fontWeight: 600,
                                color: statusInfo.color, background: statusInfo.bg,
                              }} title={isFailed ? (row.download_error ?? "") : undefined}>
                                {statusInfo.label}
                              </span>
                              {isDone && row.downloaded_at && (
                                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px" }}>
                                  {new Date(row.downloaded_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>Pending</span>
                          )}
                        </td>

                        {/* Action — Download */}
                        <td style={{ padding: "8px 10px" }}>
                          <button
                            onClick={() => downloadRow(row, pickRotatingCredential())}
                            disabled={isDownloading}
                            style={{
                              padding: "5px 12px", fontSize: "12px", fontWeight: 600, borderRadius: "6px", border: "none",
                              background: isDownloading ? "#e2e8f0" : isDone ? "#f1f5f9" : "#2563eb",
                              color: isDownloading ? "#94a3b8" : isDone ? "#475569" : "#fff",
                              cursor: isDownloading ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                            }}>
                            {isDownloading ? "Downloading…" : isDone ? "Re-download" : isFailed ? "Retry" : "Download"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* ── Database stats ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 12px rgba(15,23,42,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Products in database</h2>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>Auto-refreshes every 15 seconds</p>
            </div>
            <button onClick={fetchStats} style={{ fontSize: "12px", color: "#64748b", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}>
              Refresh now
            </button>
          </div>

          {Object.keys(dbStats).length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>No products synced yet.</p>
          ) : (
            Object.entries(dbStats).sort(([a], [b]) => a.localeCompare(b)).map(([site, types]) => {
              const total = Object.values(types).reduce((s, t) => s + t.total, 0);
              const avail = Object.values(types).reduce((s, t) => s + t.available, 0);
              return (
                <div key={site} style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>{site}</span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{total.toLocaleString()} total · {avail.toLocaleString()} available</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {Object.entries(types).sort(([a], [b]) => a.localeCompare(b)).map(([pt, counts]) => {
                      const pct = counts.total > 0 ? Math.round((counts.available / counts.total) * 100) : 0;
                      return (
                        <div key={pt} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", minWidth: "150px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{pt}</div>
                          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>
                            {counts.available.toLocaleString()}
                            <span style={{ fontSize: "12px", fontWeight: 400, color: "#94a3b8", marginLeft: "4px" }}>/ {counts.total.toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: pct > 50 ? "#16a34a" : pct > 20 ? "#d97706" : "#dc2626", marginTop: "3px" }}>{pct}% available</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Job history ── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 12px rgba(15,23,42,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Discovery history</h2>
            <button onClick={fetchJobs} style={{ fontSize: "12px", color: "#64748b", background: "none", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}>Refresh</button>
          </div>
          {loadingJobs ? (
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>Loading…</p>
          ) : jobs.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>No jobs yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {["Site", "Status", "Started", "Duration"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const started = new Date(job.started_at);
                  const duration = job.completed_at
                    ? `${Math.round((new Date(job.completed_at).getTime() - started.getTime()) / 1000)}s`
                    : "—";
                  return (
                    <tr key={job.job_id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "8px" }}>{job.site}</td>
                      <td style={{ padding: "8px" }}>
                        <span style={{ color: STATUS_COLOR[job.status] ?? "#64748b", fontWeight: 600 }}>{job.status}</span>
                        {job.error_message && (
                          <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "2px", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={job.error_message}>
                            {job.error_message}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px", color: "#64748b" }}>{started.toLocaleDateString()} {started.toLocaleTimeString()}</td>
                      <td style={{ padding: "8px", color: "#64748b" }}>{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </main>
  );
}

function Spinner() {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length), 100);
    return () => clearInterval(id);
  }, []);
  return <span style={{ display: "inline-block", width: "12px" }}>{frames[frame]}</span>;
}
