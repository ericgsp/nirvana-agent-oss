"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { fetchProducts, fetchZoneLayout, fetchLayout, fetchQuotation } from "./actions";
import { generateQuotationPdf } from "@/lib/pdf/generate-quotation-pdf";
import { shareQuotationPdf } from "@/lib/pdf/share-quotation-pdf";

// ─── Types ────────────────────────────────────────────────────


type NicheCell = {
  lot_code: string;
  niche_num: number;
  available: boolean;
  price_list_id: string | null;
  price_section_group: string | null;
  price_level: string | null;
  price_block: string | null;
};

type LevelRow = {
  level: string;
  niches: NicheCell[];
};

type SectionGroup = {
  section: string;
  lot_type: string | null;
  section_group: string;
  block: string;
  levels: LevelRow[];
  total: number;
  available: number;
};

type LayoutData = {
  site: string;
  product: string;
  sections: SectionGroup[];
};

type PromoData = {
  id: string;
  memo_reference: string;
  promo_name: string | null;
  discount_pct: number | null;
  discount_rm: number | null;
  dp_tiers: number[] | null;
  min_down_payment_pct: number | null;
  max_instalment_months: number | null;
  promo_end_date: string;
  level_restriction: string | null;
  remarks: string | null;
  dr_plus_eligible: boolean;
  dr_plus_type: string | null;
  dr_plus_fixed_units: number | null;
};

type LevelData = {
  id: string;
  level: string;
  lot_type: string | null;
  size_description: string | null;
  as_need_price: number | null;
  pre_need_price: number | null;
  original_price: number | null;
  pre_launch_price: number | null;
  trust_account_facility: number | null;
  backwall_cost: number | null;
  total_pre_need_price: number | null;
  point_value: number | null;
  available_count: number;
  promo: PromoData | null;
};

type QuotationData = {
  site: string;
  site_name_en: string;
  site_name_zh: string;
  product: string;
  product_category: string;
  block: string;
  section: string;
  lot_type: string;
  levels: LevelData[];
};

type CalcResult = {
  originalPrice: number;
  preNeedRebate: number;
  preNeedPrice: number;
  trust: number;
  backwall: number;
  totalPrice: number;
  downPayment: number;
  balance: number;
  specialRebate: number;
  instalmentAmount: number;
  tenure: number;
  monthly: number;
  lastInstalment: number;
  netTotalPrice: number;
  drPlusUnits: number;
};

// ─── Calculation ──────────────────────────────────────────────

function calcMatrix(row: LevelData, dpPct: number): CalcResult {
  const isPedestal    = !row.pre_need_price && !!row.pre_launch_price;
  const originalPrice = isPedestal ? (row.original_price ?? 0) : (row.as_need_price ?? 0);
  const preNeedPrice  = isPedestal ? (row.pre_launch_price ?? 0) : (row.pre_need_price ?? 0);
  const preNeedRebate = originalPrice - preNeedPrice;
  const trust         = row.trust_account_facility ?? 0;
  const backwall      = row.backwall_cost ?? 0;
  const totalPrice    = preNeedPrice + trust + backwall;
  const downPayment   = Math.round(totalPrice * dpPct / 100);
  const balance       = totalPrice - downPayment;

  const promo = row.promo;
  let specialRebate = 0;
  // dp_tiers: discount % matches selected DP% (auto-matched)
  if (promo?.dp_tiers?.length) {
    // Find closest DP tier that is <= selected dpPct, or just use dpPct if in the list
    const tiers = promo.dp_tiers.filter((t: number) => t <= dpPct);
    const activeTier = tiers.length ? Math.max(...tiers) : null;
    if (activeTier != null) specialRebate = Math.round(preNeedPrice * activeTier / 100);
  } else if (promo?.discount_pct != null) {
    specialRebate = Math.round(preNeedPrice * promo.discount_pct / 100);
  } else if (promo?.discount_rm != null) {
    specialRebate = promo.discount_rm;
  }

  const instalmentAmount = balance - specialRebate;
  const tenure = promo?.max_instalment_months ?? 0;
  let monthly = 0, lastInstalment = 0;
  if (tenure > 0 && instalmentAmount > 0) {
    monthly        = Math.ceil(instalmentAmount / tenure);
    lastInstalment = instalmentAmount - monthly * (tenure - 1);
  }

  const netTotalPrice = downPayment + instalmentAmount;
  const drPlusUnits   = promo?.dr_plus_eligible
    ? (promo.dr_plus_type === "fixed" ? (promo.dr_plus_fixed_units ?? 0) : Math.floor(netTotalPrice / 10000))
    : 0;

  return { originalPrice, preNeedRebate, preNeedPrice, trust, backwall, totalPrice, downPayment, balance, specialRebate, instalmentAmount, tenure, monthly, lastInstalment, netTotalPrice, drPlusUnits };
}

function fmt(n: number) { return n.toLocaleString("en-MY"); }

// ─── Colours ──────────────────────────────────────────────────

const G_DARK  = "#075E54";
const G_GREEN = "#25D366";
const G_TEAL  = "#128C7E";

function ReactTest() {
  const [n, setN] = useState(0);
  return (
    <div style={{margin:"8px 10px",padding:"10px 14px",background:"#fef3c7",borderRadius:"10px",fontSize:"13px"}}>
      React test: <strong>{n === 0 ? "tap button to test" : `✓ React working (tapped ${n}x)`}</strong>
      {" "}<button onClick={() => setN(c => c+1)} style={{marginLeft:"8px",padding:"4px 10px",background:"#f59e0b",border:"none",borderRadius:"6px",fontWeight:700}}>Tap me</button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function AgentPage({ initialSiteOpts = [] }: { initialSiteOpts?: string[] }) {
  const searchParams = useSearchParams();

  const [site,          setSite]         = useState("");
  const [product,       setProduct]       = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [levelFilter,   setLevelFilter]   = useState("");

  // Sync ALL URL params into state on every searchParams change.
  // This is the single source of truth for URL-driven navigation — avoids race
  // conditions between useEffect([site]) and useState initializers.
  useEffect(() => {
    const sp = searchParams.get("site")           ?? "";
    const pp = searchParams.get("product")        ?? "";
    const sf = searchParams.get("section_filter") ?? "";
    const lf = searchParams.get("level")          ?? "";
    setSectionFilter(sf);
    setLevelFilter(lf);
    if (sp) setSite(sp);
    if (pp) setProduct(pp);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const [siteOpts,    setSiteOpts]    = useState<string[]>(initialSiteOpts);
  const [productOpts, setProductOpts] = useState<{ name: string; category: string; available?: number | null }[]>([]);

  // Portal HTML layouts (one per zone in the product)
  type ZoneLayout = { zone: string; html: string; synced_at: string };
  const [zoneLayouts,   setZoneLayouts]   = useState<ZoneLayout[]>([]);
  const [availMap,      setAvailMap]      = useState<Record<string, boolean>>({});
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [noLayout,      setNoLayout]      = useState(false);

  // Lot metadata for quotation lookup (section_group, block, level per lot_code)
  const [lotMeta, setLotMeta] = useState<Record<string, { block: string; section_group: string }>>({});

  // Multi-select: up to 9 lots for comparison
  const MAX_LOTS = 9;
  type LotQuote = { lotCode: string; levelData: LevelData; section: string; siteInfo: QuotationData };
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [lotQuotes,    setLotQuotes]    = useState<LotQuote[]>([]);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [dpPct,        setDpPct]        = useState(10);

  const [siteOpen,    setSiteOpen]    = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  // Ref always holds the current selected set — used inside the click handler
  // to avoid stale closure issues (click handler is attached once on layout load)
  const selectedLotsRef = useRef<Set<string>>(new Set());

  const layoutRef    = useRef<HTMLDivElement>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);

  // Auto-orient (portrait vs landscape) and scale to fit one A4 page before printing.
  // Picks whichever orientation gives the LARGEST text (best readability).
  useEffect(() => {
    const el = document.getElementById("quote-section");

    // Get or create a dynamic <style> tag we can swap before each print
    let dynStyle = document.getElementById("dyn-page-style") as HTMLStyleElement | null;
    if (!dynStyle) {
      dynStyle = document.createElement("style");
      dynStyle.id = "dyn-page-style";
      document.head.appendChild(dynStyle);
    }

    const beforePrint = () => {
      if (!el || !dynStyle) return;
      el.style.zoom = "";

      const contentW = el.scrollWidth;
      const contentH = el.scrollHeight;

      // A4 usable area at 96 dpi with 12mm margins each side (1mm ≈ 3.78px)
      // Portrait : 186mm × 273mm → 703 × 1032 px
      // Landscape: 273mm × 186mm → 1032 × 703 px
      const PW = 703, PH = 1032; // portrait
      const LW = 1032, LH = 703; // landscape

      const scaleP = Math.min(PW / contentW, PH / contentH);
      const scaleL = Math.min(LW / contentW, LH / contentH);

      // Pick orientation that yields the bigger scale factor (bigger printed text)
      if (scaleP >= scaleL) {
        dynStyle.textContent = "@page { size: A4 portrait;  margin: 12mm; }";
        if (scaleP < 1) el.style.zoom = scaleP.toFixed(3);
      } else {
        dynStyle.textContent = "@page { size: A4 landscape; margin: 12mm; }";
        if (scaleL < 1) el.style.zoom = scaleL.toFixed(3);
      }
    };

    const afterPrint = () => {
      if (el) el.style.zoom = "";
      if (dynStyle) dynStyle.textContent = "";
    };

    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint",  afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint",  afterPrint);
    };
  }, []);


  // Load products when site changes.
  // Product/layout clearing is handled in the site dropdown onChange, NOT here —
  // so that URL-driven navigation (which sets site+product together) never wipes product.
  useEffect(() => {
    if (!site) { setProductOpts([]); return; }
    fetchProducts(site).then(opts => setProductOpts(opts));
  }, [site]);

  function resetLayout() {
    setZoneLayouts([]); setAvailMap({}); setLotMeta({});
    setSelectedLots([]); setLotQuotes([]); setNoLayout(false);
    selectedLotsRef.current.clear();
  }

  // Fetch portal layout HTML when product selected
  useEffect(() => {
    if (!site || !product) { resetLayout(); return; }
    setLayoutLoading(true); resetLayout();

    // Load both the portal HTML layout AND the lot metadata in parallel
    Promise.all([
      fetchZoneLayout(site, product),
      fetchLayout(site, product),
    ]).then(([zl, ld]) => {
      // Portal HTML layouts
      if (zl.layouts?.length) {
        setZoneLayouts(zl.layouts);
        setAvailMap(zl.availability ?? {});
        setNoLayout(false);
      } else {
        setNoLayout(true);
      }
      // Build lot → {block, section_group} lookup from structured layout data
      const meta: Record<string, { block: string; section_group: string }> = {};
      for (const sec of (ld.sections ?? []) as SectionGroup[]) {
        for (const lvl of sec.levels) {
          for (const niche of lvl.niches) {
            if (niche.price_block && niche.price_section_group) {
              meta[niche.lot_code] = { block: niche.price_block, section_group: niche.price_section_group };
            }
          }
        }
      }
      setLotMeta(meta);
    }).finally(() => setLayoutLoading(false));
  }, [site, product]);

  // After every render, sync cell colours — runs synchronously before browser paint
  // so cells are NEVER visible in the wrong state even if dangerouslySetInnerHTML re-injects
  const hasAvailData = Object.keys(availMap).length > 0;

  // Extract level from lot_code: "D3-08-06" → "8"
  function getLotLevel(lotCode: string): string {
    const parts = lotCode.split("-");
    if (parts.length < 3) return "";
    return parseInt(parts[parts.length - 2], 10).toString();
  }

  useLayoutEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>("[data-lot]").forEach(td => {
      const lot = td.dataset.lot!;

      // Section prefix filter: "D3-08-06" → prefix "D"; if sectionFilter="D" only D-prefix visible
      if (sectionFilter) {
        const section = lot.split("-")[0] ?? "";
        const prefix  = section.replace(/\d.*$/, "");
        if (prefix !== sectionFilter) { td.className = "nz-filtered"; return; }
      }

      // Level filter: "D3-08-06" → level 8; if levelFilter="8" only level-8 cells visible
      if (levelFilter) {
        if (getLotLevel(lot) !== levelFilter) { td.className = "nz-filtered"; return; }
      }

      if (selectedLotsRef.current.has(lot)) {
        td.className = "nz-selected";
      } else if (hasAvailData) {
        td.className = (availMap[lot] ?? false) ? "nz-avail" : "nz-sold";
      }
    });
  });

  // Click handler — React onClick prop, always has the latest closure values
  const handleLayoutClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-lot]");
    if (!cell) return;
    const lot = cell.dataset.lot!;

    // Block tapping cells that are filtered out by section or level
    if (sectionFilter) {
      const sec = lot.split("-")[0] ?? "";
      if (sec.replace(/\d.*$/, "") !== sectionFilter) return;
    }
    if (levelFilter && getLotLevel(lot) !== levelFilter) return;

    const isSelected = selectedLotsRef.current.has(lot);
    const isAvail    = hasAvailData ? (availMap[lot] ?? false) : cell.classList.contains("nz-avail");
    if (!isSelected && !isAvail) return;

    if (isSelected) {
      // Deselect
      selectedLotsRef.current.delete(lot);
      setSelectedLots([...selectedLotsRef.current]);
      setLotQuotes(prev => prev.filter(q => q.lotCode !== lot));
      return;
    }

    if (selectedLotsRef.current.size >= MAX_LOTS) return;

    // Select — ref update is immediate; state update triggers re-render + useLayoutEffect colours it blue
    selectedLotsRef.current.add(lot);
    setSelectedLots([...selectedLotsRef.current]);

    const meta    = lotMeta[lot];
    const block   = meta?.block         ?? product;
    const section = meta?.section_group ?? (lot.split("-")[0] ?? "");
    const parts   = lot.split("-");
    const rawLvl  = (meta as any)?.price_level ?? parts[1] ?? "";
    const level   = rawLvl ? parseInt(rawLvl, 10).toString() : "";
    if (!block || !section) return;

    setQuoteLoading(true);
    const lvls = level ? [level] : [];
    fetchQuotation(site, product, block, section, lvls)
      .then((json: QuotationData) => {
        if (!(json as any).error && json.levels?.length) {
          const levelData = json.levels.find(l => l.level === level) ?? json.levels[0];
          setLotQuotes(prev => [...prev, { lotCode: lot, levelData, section: json.section, siteInfo: json }]);
          setTimeout(() => quoteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
        }
      })
      .finally(() => setQuoteLoading(false));
  }, [availMap, hasAvailData, lotMeta, product, site]);

  return (
    <>
      {/* Eruda mobile debug console — remove after diagnosis */}
      <script src="https://cdn.jsdelivr.net/npm/eruda" />
      <script dangerouslySetInnerHTML={{__html: "eruda.init();"}} />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          min-height: 100dvh;
          background: #1a1a2e;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Phone shell */
        #phone {
          width: 100%; max-width: 430px; min-height: 100dvh;
          margin: 0 auto; background: #f0f2f5;
          display: flex; flex-direction: column;
        }

        /* Sticky top bar */
        #topbar {
          background: ${G_DARK}; color: #fff;
          padding: 10px 14px; display: flex; align-items: center; gap: 10px;
          position: sticky; top: 0; z-index: 30;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25); flex-shrink: 0;
        }
        #topbar h1 { font-size: 16px; font-weight: 700; flex: 1; }
        .btn-back  { color: #fff; text-decoration: none; font-size: 20px; line-height: 1; }
        .btn-pdf   { padding: 6px 12px; border-radius: 6px; background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.35); font-size: 12px; font-weight: 700; cursor: pointer; }

        /* Scroll body */
        #scroll-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 20px; }

        /* Availability banner */
        .avail-banner {
          display: flex; align-items: center; gap: 12px;
          margin: 10px 10px 0; padding: 13px 16px;
          background: linear-gradient(135deg, ${G_DARK} 0%, ${G_TEAL} 100%);
          border-radius: 14px; box-shadow: 0 2px 8px rgba(7,94,84,0.35);
          text-decoration: none; cursor: pointer;
        }
        .avail-banner:active { opacity: 0.88; }
        .avail-banner-left { flex: 1; }
        .avail-banner-title { font-size: 14px; font-weight: 800; color: #fff; }
        .avail-banner-sub   { font-size: 11px; color: rgba(255,255,255,0.75); margin-top: 3px; }
        .avail-banner-arrow { font-size: 26px; color: rgba(255,255,255,0.6); font-weight: 300; line-height: 1; }

        /* Section cards */
        .s-card { margin: 10px 10px 0; background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        /* Step label */
        .s-label { display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-bottom: 1px solid #f0f2f5; }
        .s-dot { width: 22px; height: 22px; border-radius: 50%; background: ${G_DARK}; color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .s-title { font-size: 13px; font-weight: 700; color: #0f172a; flex: 1; }
        .s-sub   { font-size: 11px; color: #94a3b8; }
        .btn-reset {
          margin-left: auto; font-size: 11px; font-weight: 700; color: #64748b;
          background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px;
          padding: 3px 10px; cursor: pointer;
        }
        .btn-reset:active { background: #e2e8f0; }
        .filter-badge {
          font-size: 11px; font-weight: 700; color: #fff;
          background: #1e40af; border-radius: 999px; padding: 2px 9px;
          cursor: pointer;
        }
        .filter-badge:active { opacity: 0.75; }

        /* ── Zone filter ── */
        #zone-filter { padding: 12px 14px; display: flex; gap: 8px; }
        .f-wrap { flex: 1; display: flex; flex-direction: column; gap: 3px; position: relative; }
        .f-lbl  { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        /* Custom dropdown button */
        .f-btn { width: 100%; padding: 10px 28px 10px 10px; border-radius: 9px; border: 1.5px solid #e2e8f0; font-size: 14px; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center; color: #0f172a; text-align: left; cursor: pointer; }
        .f-btn.placeholder { color: #94a3b8; }
        .f-btn:disabled { background-color: #f8fafc; color: #cbd5e1; cursor: default; }
        /* Bottom sheet picker */
        .bs-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; }
        .bs-sheet { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-radius: 18px 18px 0 0; z-index: 1001; max-height: 60vh; display: flex; flex-direction: column; }
        .bs-handle { width: 36px; height: 4px; background: #cbd5e1; border-radius: 2px; margin: 10px auto 4px; flex-shrink: 0; }
        .bs-title { font-size: 13px; font-weight: 700; color: #64748b; text-align: center; padding: 4px 0 10px; flex-shrink: 0; border-bottom: 1px solid #f1f5f9; }
        .bs-list { overflow-y: auto; flex: 1; }
        .bs-opt { display: block; width: 100%; padding: 15px 20px; text-align: left; background: none; border: none; font-size: 16px; color: #0f172a; cursor: pointer; border-bottom: 1px solid #f8fafc; }
        .bs-opt:active { background: #f0fdf4; }
        .bs-opt.selected { color: ${G_DARK}; font-weight: 700; }
        .f-sel  {
          width: 100%; padding: 10px 28px 10px 10px; border-radius: 9px;
          border: 1.5px solid #e2e8f0; font-size: 14px;
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 8px center;
          color: #0f172a; outline: none; -webkit-appearance: none; appearance: none;
        }
        .f-sel:focus    { border-color: ${G_TEAL}; }
        .f-sel:disabled { background-color: #f8fafc; color: #cbd5e1; }

        /* ── Portal layout HTML area ── */
        #layout-area { padding: 0; }

        .layout-placeholder {
          margin: 12px; min-height: 150px; border: 2px dashed #e2e8f0; border-radius: 10px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; color: #94a3b8; background: #fafbfc; text-align: center; padding: 20px;
        }
        .lp-icon  { font-size: 32px; }
        .lp-title { font-size: 13px; font-weight: 600; color: #64748b; }
        .lp-sub   { font-size: 11px; line-height: 1.5; }

        /* Legend */
        .legend { display: flex; gap: 12px; padding: 8px 12px 6px; border-bottom: 1px solid #f0f2f5; }
        .leg-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #64748b; }
        .leg-dot  { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }

        /* Selected lots chip bar */
        .selected-bar {
          padding: 6px 12px 4px; display: flex; flex-wrap: wrap; gap: 5px;
          border-bottom: 1px solid #f0f2f5; background: #f8fafc;
        }
        .sel-chip {
          display: inline-flex; align-items: center; gap: 4px;
          background: #1a3a6b; color: #fff; border-radius: 999px;
          padding: 3px 8px 3px 10px; font-size: 10px; font-weight: 700; cursor: pointer;
        }
        .sel-chip-x { font-size: 13px; line-height: 1; opacity: 0.7; }
        .sel-chip:active { opacity: 0.75; }

        /* Zone label above each table */
        .zone-label {
          padding: 5px 12px; background: #f8fafc; border-top: 1px solid #f0f2f5;
          font-size: 11px; font-weight: 700; color: #64748b;
        }

        /* Layout card — capped height so Section 3 is always visible below */
        #layout-card {
          max-height: 340px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* Scrollable wrapper for the portal HTML table */
        .portal-scroll {
          overflow-x: auto; overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          padding: 6px 0 8px;
        }

        /* ── Nirvana portal cell classes (override original bgcolor) ── */
        /* Applied by useEffect after HTML is injected */
        .nz-avail {
          background: #22c55e !important; color: #fff !important;
          font-size: 9px !important; font-weight: 700 !important;
          cursor: pointer !important;
          padding: 4px 3px !important;
          min-width: 68px !important; white-space: nowrap !important;
          user-select: none;
        }
        .nz-avail:active { opacity: 0.75 !important; }
        .nz-sold {
          background: #f1f5f9 !important; color: #94a3b8 !important;
          font-size: 9px !important;
          padding: 4px 3px !important;
          min-width: 68px !important; white-space: nowrap !important;
          cursor: default !important;
        }
        .nz-filtered {
          background: #e2e8f0 !important; color: #cbd5e1 !important;
          font-size: 9px !important; padding: 4px 3px !important;
          min-width: 68px !important; white-space: nowrap !important;
          cursor: default !important; opacity: 0.45 !important;
        }
        .nz-selected {
          background: #1a3a6b !important; color: #fff !important;
          font-size: 9px !important; font-weight: 700 !important;
          padding: 4px 3px !important; min-width: 68px !important;
          cursor: pointer !important;
          outline: 3px solid #facc15 !important; outline-offset: -2px !important;
        }
        .nz-gap   { background: #e2e8f0 !important; min-width: 20px !important; }
        .nz-label { background: #fff !important; font-size: 10px !important; font-weight: 600 !important; color: #334155 !important; white-space: nowrap !important; padding: 3px 6px !important; }
        .nz-empty { background: #fff !important; min-width: 8px !important; padding: 0 !important; }
        .nz-wall-gap td { height: 14px !important; background: #f0f2f5 !important; padding: 0 !important; }
        .nz-wall-header td { padding: 0 !important; }
        .nz-wall-cell { background: #075E54 !important; padding: 5px 10px !important; display: flex !important; align-items: center !important; gap: 10px !important; }
        .nz-wall-name { font-size: 11px !important; font-weight: 800 !important; color: #fff !important; letter-spacing: 0.04em !important; white-space: nowrap !important; }
        .nz-wall-stat { font-size: 10px !important; color: rgba(255,255,255,0.75) !important; white-space: nowrap !important; }

        /* The injected table itself */
        .nirvana-zone-layout table { border-collapse: collapse; }
        .nirvana-zone-layout td { border: 1px solid #e2e8f0 !important; text-align: center !important; vertical-align: middle !important; }

        /* ── Quotation section ── */
        #quote-section { margin: 10px 10px 0; }

        .quote-empty {
          padding: 36px 20px; text-align: center; color: #94a3b8;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .qe-icon { font-size: 32px; }
        .qe-msg  { font-size: 13px; line-height: 1.5; }

        /* DP strip */
        #dp-strip {
          padding: 9px 14px; background: #f8fafc; border-bottom: 1px solid #f0f2f5;
          display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
        }
        #dp-strip .lbl { font-size: 11px; font-weight: 700; color: #64748b; white-space: nowrap; }
        .dp-pill { padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid #e2e8f0; cursor: pointer; background: #fff; color: #334155; }
        .dp-pill.on { background: ${G_TEAL}; border-color: ${G_TEAL}; color: #fff; }

        /* Quotation table */
        .qt-header { padding: 14px 14px 10px; text-align: center; border-bottom: 2px solid #1a3a6b; }
        .qt-header .h-brand    { font-size: 15px; font-weight: 700; color: #1a3a6b; }
        .qt-header .h-site-en  { font-size: 14px; font-weight: 700; color: #0f172a; }
        .qt-header .h-site-zh  { font-size: 13px; color: #0f172a; margin-top: 1px; }
        .qt-header .h-product  { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 6px; }
        .qt-header .h-category { font-size: 12px; color: #0f172a; margin-top: 1px; }
        .qt-header .h-section    { font-size: 13px; font-weight: 700; color: #dc2626; margin-top: 4px; }
        .qt-header .h-lot        { font-size: 11px; color: #64748b; margin-top: 2px; }
        .qt-header .h-promo-badge {
          display: inline-block; margin-top: 6px;
          background: #dc2626; color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          padding: 2px 10px; border-radius: 999px;
        }

        .qt-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .qt { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        .qt td, .qt th { border: 1px solid #b0b8c1; padding: 5px 8px; white-space: nowrap; }
        /* Hide divider between English and Chinese label cells; bold border after Chinese cell */
        .qt tbody tr td:first-child  { border-right: none; }
        .qt tbody tr td:nth-child(2) { border-left: none; border-right: 2px solid #1a3a6b; }
        .qt thead th { background: #1a3a6b; color: #fff; text-align: center; font-weight: 700; font-size: 11px; }
        .qt thead th.tc-lbl { text-align: left; min-width: 135px; }
        .qt thead th.tc-zh  { text-align: left; min-width: 95px; }
        .qt thead th.tc-val { min-width: 65px; }
        .qt tbody td { background: #fff; color: #0f172a; vertical-align: middle; }
        .qt tbody td.tv { text-align: center; font-variant-numeric: tabular-nums; }
        .qt tr.tbold td     { font-weight: 700; }
        .qt tr.tpnp td      { background: #fef9c3; }
        .qt tr.tinst td     { background: #dbeafe; }
        .qt tr.tred td      { color: #dc2626; font-weight: 700; }
        .qt tr.ttenure td   { background: #c6efce; color: #0f172a; font-weight: 700; }
        .qt tr.tnet-rule td { background: #fff; height: 3px; padding: 0; border: none; }
        .qt tr.tnet td      { background: #1a3a6b; color: #fff; font-weight: 700; font-size: 12px;
                              border-color: rgba(255,255,255,0.4); border-style: solid; border-width: 1px; }
        .qt tr.tnet td.tv   { border-left: 3px solid #fff; }
        .qt tr.tdr td       { background: #ffeb9c; color: #9c5700; font-weight: 700; }
        .qt tr.tsep td      { background: #f8fafc; border: none; height: 4px; padding: 0; }
        /* Highlight the level column matching selected niche */
        .qt td.selected-col { background: #eff6ff !important; font-weight: 700; }
        .qt th.selected-col { background: #1e3a8a !important; }

        .qt-footer { padding: 10px 14px 14px; font-size: 10.5px; color: #334155; border-top: 1px solid #e2e8f0; }
        .qt-footer p { margin: 2px 0; line-height: 1.5; }
        .qt-footer .f-valid { font-weight: 700; margin-bottom: 4px; }

        /* @page orientation is set dynamically by JS before each print */
        @page { margin: 12mm; }

        /* Custom print footer (date left, page right) */
        #print-footer { display: none; }

        /* Watermark — hidden on screen, shown on print */
        .wm-wrap {
          display: none;
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          overflow: hidden;
        }
        .wm-text {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 52px; font-weight: 900; letter-spacing: 4px; white-space: nowrap;
          color: rgba(26, 58, 107, 0.07);
          text-transform: uppercase;
          user-select: none;
        }

        @media print {
          /* Force background colours to print */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body { background: #fff !important; margin: 0; padding: 0; }

          /* Hide everything except the quotation card */
          #topbar, .s-label, #zone-filter, #layout-area, .no-print,
          #dp-strip, .avail-banner, .s-card:not(#quote-section) { display: none !important; }

          /* Strip phone shell width limits so table fills A4 landscape */
          #phone {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          #scroll-body {
            overflow: visible !important;
            padding: 0 !important;
          }
          #quote-section {
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .s-card { margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .quote-empty { display: none !important; }
          .qt-scroll { overflow: visible !important; width: 100% !important; }

          /* Table sizing — title 14px, col header 13px, data 12px */
          .qt { font-size: 12px !important; width: 100% !important; }
          .qt thead th { font-size: 13px !important; padding: 5px 8px !important; }
          .qt td { padding: 4px 8px !important; }
          .qt-header { padding: 10px 10px 8px !important; }
          .qt-header .h-brand    { font-size: 14px !important; }
          .qt-header .h-product  { font-size: 13px !important; }
          .qt-header .h-category { font-size: 12px !important; }
          .qt-header .h-site-zh  { font-size: 12px !important; }
          .qt tbody td.tv { text-align: center !important; }

          /* Re-assert all coloured rows */
          .qt thead th { background: #1a3a6b !important; color: #fff !important; }
          .qt tr.tred td { color: #dc2626 !important; font-weight: 700 !important; }
          .qt tr.tpnp td  { background: #fef9c3 !important; }
          .qt tr.tinst td { background: #dbeafe !important; }
          .qt tr.ttenure td { background: #c6efce !important; color: #0f172a !important; font-weight: 700 !important; }
          .qt tr.tnet-rule td { background: #fff !important; height: 3px !important; padding: 0 !important; border: none !important; }
          .qt tr.tnet td { background: #1a3a6b !important; color: #fff !important; font-weight: 700 !important;
                           border-color: rgba(255,255,255,0.4) !important; }
          .qt tr.tnet td.tv { border-left: 3px solid #fff !important; }
          .qt tr.tdr td { background: #ffeb9c !important; color: #9c5700 !important; font-weight: 700 !important; }
          .qt tr.tbold td { font-weight: 700 !important; }
          .qt tbody tr td:first-child  { border-right: none !important; }
          .qt tbody tr td:nth-child(2) { border-left: none !important; border-right: 2px solid #1a3a6b !important; }
          .qt-header .h-brand { font-size: 14px !important; font-weight: 700 !important; color: #1a3a6b !important; }

          /* Watermark visible on print */
          .wm-wrap { display: block !important; }

          /* Show our custom footer instead of browser's */
          #print-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            margin-top: 6px !important;
            padding-top: 4px !important;
            border-top: 1px solid #cbd5e1 !important;
            font-size: 9px !important;
            color: #64748b !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div id="phone">

        {/* ── Top bar ── */}
        <div id="topbar" className="no-print">
          <Link href="/" className="btn-back">←</Link>
          <h1>Nirvana Agent</h1>
          {lotQuotes.length > 0 && (
            <button className="btn-pdf" onClick={async () => {
              // Native app: no in-WebView print dialog, so generate a PDF and
              // hand it to the OS share sheet (Save / Print / share to any app)
              if (Capacitor.isNativePlatform()) {
                try {
                  const blob = await generateQuotationPdf();
                  await shareQuotationPdf(blob);
                } catch (err) {
                  console.error("Failed to generate/share quotation PDF", err);
                }
                return;
              }

              // Web: unchanged — browser print dialog
              // Blank title so browser doesn't print it in the page header
              const prev = document.title;
              document.title = "";
              // Stamp current date in our custom footer
              const el = document.getElementById("print-date");
              if (el) el.textContent = new Date().toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" });
              window.print();
              setTimeout(() => { document.title = prev; }, 500);
            }}>🖨 PDF</button>
          )}
        </div>

        <div id="scroll-body">

          {/* ── REACT TEST — remove after diagnosis ── */}
          <ReactTest />

          {/* ── Availability banner ── */}
          <Link href="/agent/search" className="avail-banner no-print">
            <div className="avail-banner-left">
              <div className="avail-banner-title">What&apos;s Available Now?</div>
              <div className="avail-banner-sub">Browse by product type · filter by level · sort by price</div>
            </div>
            <div className="avail-banner-arrow">›</div>
          </Link>

          {/* ══ SECTION 1 — Zone Filter ══ */}
          <div className="s-card">
            <div className="s-label no-print">
              <div className="s-dot">1</div>
              <span className="s-title">Select Site &amp; Zone</span>
              {site && product && <span className="s-sub">{site} · {product}</span>}
              {(site || product || selectedLots.length > 0) && (
                <button className="btn-reset" onClick={() => {
                  setSite(""); setProduct(""); setSectionFilter(""); setLevelFilter("");
                  setProductOpts([]); resetLayout();
                }}>↺ Reset</button>
              )}
            </div>
            <div id="zone-filter">
              <div className="f-wrap">
                <div className="f-lbl">Site</div>
                <button className={`f-btn${site ? "" : " placeholder"}`} onClick={() => setSiteOpen(true)}>
                  {site || "Choose site…"}
                </button>
              </div>
              <div className="f-wrap">
                <div className="f-lbl">Zone / Product</div>
                <button className={`f-btn${product ? "" : " placeholder"}`} disabled={!site} onClick={() => setProductOpen(true)}>
                  {product || "Choose zone…"}
                </button>
              </div>
            </div>
          </div>

          {/* Site picker bottom sheet */}
          {siteOpen && (
            <>
              <div className="bs-backdrop" onClick={() => setSiteOpen(false)} />
              <div className="bs-sheet">
                <div className="bs-handle" />
                <div className="bs-title">Select Site</div>
                <div className="bs-list">
                  {siteOpts.map(s => (
                    <button key={s} className={`bs-opt${s === site ? " selected" : ""}`} onClick={() => {
                      setSite(s); setProduct(""); setSectionFilter(""); setLevelFilter(""); resetLayout(); setSiteOpen(false);
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Zone/Product picker bottom sheet */}
          {productOpen && (
            <>
              <div className="bs-backdrop" onClick={() => setProductOpen(false)} />
              <div className="bs-sheet">
                <div className="bs-handle" />
                <div className="bs-title">Select Zone / Product</div>
                <div className="bs-list">
                  {productOpts.map(p => (
                    <button key={p.name} className={`bs-opt${p.name === product ? " selected" : ""}`} onClick={() => {
                      setProduct(p.name); setSectionFilter(""); setLevelFilter(""); resetLayout(); setProductOpen(false);
                    }}>{p.name}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ══ SECTION 2 — Zone Layout ══ */}
          <div className="s-card">
            <div className="s-label no-print">
              <div className="s-dot">2</div>
              <span className="s-title">Select a Niche</span>
              {(sectionFilter || levelFilter) ? (
                <span className="filter-badge" onClick={() => { setSectionFilter(""); setLevelFilter(""); }}>
                  {[sectionFilter && `${sectionFilter} only`, levelFilter && `L${levelFilter}`].filter(Boolean).join(" · ")} ×
                </span>
              ) : (
                <span className="s-sub">
                  {selectedLots.length > 0 ? `${selectedLots.length} selected` : "Tap available niches"}
                </span>
              )}
            </div>

            <div id="layout-area">
              {/* Placeholder states */}
              {!site || !product ? (
                <div className="layout-placeholder">
                  <span className="lp-icon">🗺️</span>
                  <span className="lp-title">Zone layout will appear here</span>
                  <span className="lp-sub">Select a site and zone above</span>
                </div>
              ) : layoutLoading ? (
                <div className="layout-placeholder">
                  <span className="lp-icon">⏳</span>
                  <span className="lp-title">Loading layout…</span>
                </div>
              ) : noLayout ? (
                <div className="layout-placeholder">
                  <span className="lp-icon">📭</span>
                  <span className="lp-title">No layout saved yet</span>
                  <span className="lp-sub">Run a Product Sync for {product} to generate the layout</span>
                </div>
              ) : zoneLayouts.length > 0 ? (
                <>
                  {/* Legend */}
                  <div className="legend no-print">
                    <div className="leg-item">
                      <div className="leg-dot" style={{ background: "#22c55e", border: "1px solid #16a34a" }}></div>
                      Available
                    </div>
                    <div className="leg-item">
                      <div className="leg-dot" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}></div>
                      Unavailable
                    </div>
                    <div className="leg-item">
                      <div className="leg-dot" style={{ background: "#1a3a6b" }}></div>
                      Selected ({selectedLots.length}/{MAX_LOTS})
                    </div>
                  </div>

                  {/* Selected lots chip bar */}
                  {selectedLots.length > 0 && (
                    <div className="selected-bar no-print">
                      {selectedLots.map(lot => (
                        <div key={lot} className="sel-chip" onClick={() => {
                          selectedLotsRef.current.delete(lot);
                          setSelectedLots([...selectedLotsRef.current]);
                          setLotQuotes(prev => prev.filter(q => q.lotCode !== lot));
                        }}>
                          {lot} <span className="sel-chip-x">×</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Portal HTML injected here — one scrollable block per zone */}
                  <div ref={layoutRef} id="layout-card" onClick={handleLayoutClick}>
                    {zoneLayouts.map(zl => (
                      <div key={zl.zone}>
                        {zoneLayouts.length > 1 && (
                          <div className="zone-label">{zl.zone}</div>
                        )}
                        <div className="portal-scroll">
                          <div
                            className="nirvana-zone-layout"
                            dangerouslySetInnerHTML={{ __html: zl.html }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* ══ SECTION 3 — Quotation ══ */}
          <div className="s-card" id="quote-section" ref={quoteSectionRef}>
            <div className="s-label no-print">
              <div className="s-dot">3</div>
              <span className="s-title">Quotation</span>
              {lotQuotes.length > 0 && (
                <span className="s-sub">{lotQuotes.length} lot{lotQuotes.length > 1 ? "s" : ""} selected</span>
              )}
            </div>

            {quoteLoading && lotQuotes.length === 0 ? (
              <div className="quote-empty">
                <span className="qe-icon">⏳</span>
                <span className="qe-msg">Loading quotation…</span>
              </div>
            ) : lotQuotes.length > 0 ? (
              <>
                <div id="dp-strip" className="no-print">
                  <span className="lbl">Down Payment:</span>
                  {[10, 20, 30, 50, 100].map(p => (
                    <div key={p} className={`dp-pill${dpPct === p ? " on" : ""}`} onClick={() => setDpPct(p)}>{p}%</div>
                  ))}
                  {quoteLoading && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>Loading…</span>}
                </div>
                <ComparisonMatrix quotes={lotQuotes} dpPct={dpPct} />
              </>
            ) : (
              <div className="quote-empty">
                <span className="qe-icon">📋</span>
                <span className="qe-msg">
                  {!product
                    ? "Select a site and zone to get started"
                    : "Tap available niches above to compare prices (up to 9)"}
                </span>
              </div>
            )}
          </div>

        </div>{/* end scroll-body */}

        {/* Custom print footer — hidden on screen, visible in print */}
        <div id="print-footer">
          <span id="print-date"></span>
          <span>Page 1</span>
        </div>

      </div>{/* end phone */}
    </>
  );
}

// ─── Comparison Matrix (multi-lot) ────────────────────────────

type LotQuoteRow = { lotCode: string; levelData: LevelData; section: string; siteInfo: QuotationData };

function ComparisonMatrix({ quotes, dpPct }: { quotes: LotQuoteRow[]; dpPct: number }) {
  if (!quotes.length) return null;

  const calcs = quotes.map(q => ({ q, c: calcMatrix(q.levelData, dpPct) }));

  const hasRebate     = calcs.some(x => x.c.preNeedRebate > 0);
  const hasBackwall   = calcs.some(x => (x.q.levelData.backwall_cost ?? 0) > 0);
  const hasPromo      = calcs.some(x => !!x.q.levelData.promo);
  const hasInstalment = hasPromo && calcs.some(x => x.c.tenure > 0);
  const hasDrPlus     = calcs.some(x => x.c.drPlusUnits > 0);
  const maxTenure     = Math.max(...calcs.map(x => x.c.tenure), 0);

  const firstPromo = calcs.find(x => x.q.levelData.promo)?.q.levelData.promo ?? null;
  const getDpActiveTier = (promo: PromoData | null) => {
    if (!promo?.dp_tiers?.length) return null;
    const tiers = promo.dp_tiers.filter((t: number) => t <= dpPct);
    return tiers.length ? Math.max(...tiers) : null;
  };
  const activeDpTier = getDpActiveTier(firstPromo);
  const specialRebateLabel = activeDpTier != null
    ? `${activeDpTier}% Special Rebate`
    : firstPromo?.discount_pct != null
      ? `${firstPromo.discount_pct}% Special Rebate`
      : "Special Rebate";

  const info = quotes[0].siteInfo;

  // V = value cell for a specific column
  const V = ({ c, val, cls }: { c: CalcResult; val: string | number; cls?: string }) =>
    <td className={`tv${cls ? " " + cls : ""}`}>{val}</td>;

  return (
    <div style={{ position: "relative" }}>
      {/* Watermark — visible on print only */}
      <div className="wm-wrap" aria-hidden="true">
        <div className="wm-text">BDD1228</div>
      </div>
      <div className="qt-header">
        <div className="h-brand">Nirvana Memorial Park – {info.site_name_en || info.site}</div>
        {info.site_name_zh && <div className="h-site-zh">{info.site_name_zh}</div>}
        <div className="h-product">{info.product}</div>
        <div className="h-category">{info.product_category}</div>
        {firstPromo?.promo_name && (
          <div className="h-promo-badge">{firstPromo.promo_name}</div>
        )}
      </div>

      <div className="qt-scroll">
        <table className="qt">
          <thead>
            <tr>
              <th className="tc-lbl" colSpan={2}>Description 描述</th>
              {calcs.map(({ q }) => (
                <th key={q.lotCode} className="tc-val" style={{ minWidth: 80 }}>
                  <div style={{ fontSize: 10 }}>{q.section} L{parseInt(q.lotCode.split("-")[1] ?? "0", 10)}</div>
                  <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.85 }}>{q.lotCode}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>

            <tr>
              <td>Original Price</td><td>原价</td>
              {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={fmt(c.originalPrice)} />)}
            </tr>

            {hasRebate && (
              <tr className="tred">
                <td>Pre Need Rebate</td><td>事前规划回扣</td>
                {calcs.map(({ q, c }) => <td key={q.lotCode} className="tv">{c.preNeedRebate > 0 ? `(${fmt(c.preNeedRebate)})` : "—"}</td>)}
              </tr>
            )}

            <tr className="tbold tpnp">
              <td>Pre Need Price</td><td>价格</td>
              {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={fmt(c.preNeedPrice)} />)}
            </tr>

            <tr>
              <td>Trust Account 3 &amp; Facility Cost</td><td>储托账户3及设施款项</td>
              {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={fmt(c.trust)} />)}
            </tr>

            {hasBackwall && (
              <tr>
                <td>Backwall Cost</td><td>后壁费用</td>
                {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={(q.levelData.backwall_cost ?? 0) > 0 ? fmt(c.backwall) : "—"} />)}
              </tr>
            )}

            <tr className="tbold">
              <td>Total Price</td><td>总价</td>
              {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={fmt(c.totalPrice)} />)}
            </tr>

            <tr className="tsep"><td colSpan={calcs.length + 2}></td></tr>

            <tr>
              <td><strong>{dpPct}%</strong> Down Payment</td><td>头期</td>
              {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={fmt(c.downPayment)} />)}
            </tr>

            <tr>
              <td>Balance</td><td>余额</td>
              {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={fmt(c.balance)} />)}
            </tr>

            {hasPromo && (
              <tr className="tred">
                <td>
                  {activeDpTier != null
                    ? <><strong>{activeDpTier}%</strong> Special Rebate</>
                    : firstPromo?.discount_pct != null
                      ? <><strong>{firstPromo.discount_pct}%</strong> Special Rebate</>
                      : "Special Rebate"}
                </td><td>特别回扣</td>
                {calcs.map(({ q, c }) => <td key={q.lotCode} className="tv">{q.levelData.promo ? fmt(c.specialRebate) : "—"}</td>)}
              </tr>
            )}

            {hasInstalment && (
              <tr className="tbold tinst">
                <td>Instalment Amount</td><td>供期余额</td>
                {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={c.tenure > 0 ? fmt(c.instalmentAmount) : "—"} />)}
              </tr>
            )}

            {hasInstalment && (
              <tr className="ttenure">
                <td>Instalment Tenure</td><td>分期付款期限</td>
                {calcs.map(({ q, c }) => <td key={q.lotCode} className="tv">{c.tenure > 0 ? c.tenure : "—"}</td>)}
              </tr>
            )}

            {hasInstalment && (
              <tr>
                <td>1st – {maxTenure - 1}th</td><td></td>
                {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={c.tenure > 0 ? fmt(c.monthly) : "—"} />)}
              </tr>
            )}

            {hasInstalment && (
              <tr>
                <td>{maxTenure}th</td><td></td>
                {calcs.map(({ q, c }) => <V key={q.lotCode} c={c} val={c.tenure > 0 ? fmt(c.lastInstalment) : "—"} />)}
              </tr>
            )}

            <tr className="tnet-rule"><td colSpan={calcs.length + 2}></td></tr>
            <tr className="tnet">
              <td colSpan={2}>NET TOTAL PRICE 净价</td>
              {calcs.map(({ q, c }) => <td key={q.lotCode} className="tv">{fmt(c.netTotalPrice)}</td>)}
            </tr>
            <tr className="tnet-rule"><td colSpan={calcs.length + 2}></td></tr>

            {hasDrPlus && (
              <>
                <tr className="tsep"><td colSpan={calcs.length + 2}></td></tr>
                <tr className="tdr">
                  <td>Entitled Unit DRPlus</td><td>DRPlus 有权单位</td>
                  {calcs.map(({ q, c }) => <td key={q.lotCode} className="tv">{c.drPlusUnits > 0 ? c.drPlusUnits : "—"}</td>)}
                </tr>
              </>
            )}

          </tbody>
        </table>
      </div>

      <div className="qt-footer">
        {firstPromo && <p className="f-valid">*** Valid until : &nbsp;&nbsp;{firstPromo.promo_end_date}</p>}
        <p>1. Only NEW Pre-Need sale confirmed during the promotion period is eligible to this promotion.</p>
        <p>2. Purchasers are required to submit the balance payment documents support upon sales confirmation.</p>
        <p>3. No Booking and Reservation allowed for products with 35% discount and above.</p>
        {firstPromo?.remarks && <p>4. {firstPromo.remarks}</p>}
        <p style={{ marginTop: "5px" }}>*公司保留权力，在必须时随时更改以上价格</p>
        <p>*Company reserves the rights to amend any of the above terms and conditions when it deemed fit.</p>
      </div>
    </div>
  );
}
