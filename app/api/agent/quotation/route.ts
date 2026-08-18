import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ── Southern Region sites — never inherit Central Promo ──────────────────────
// Add to this set only when user confirms a new site is Southern Region.
const SOUTHERN_SITES = new Set(["melaka"]);

// ── Promo matching (mirrors app/api/inventory/route.ts) ──────────────────────

type PromoRow = {
  id: string;
  memo_reference: string;
  promo_name: string | null;
  site_code: string;
  product_name: string;
  lot_type: string | null;
  match_scope: string | null;
  lot_range: string | null;
  level_restriction: string | null;
  min_down_payment_pct: number | null;
  max_instalment_months: number | null;
  discount_pct: number | null;
  discount_rm: number | null;
  dp_tiers: number[] | null;
  dr_plus_eligible: boolean;
  dr_plus_type: string | null;
  dr_plus_fixed_units: number | null;
  is_combo: boolean;
  combo_total_price: number | null;
  promo_start_date: string;
  promo_end_date: string;
  instalment_tiers: { max_price: number | null; months: number }[] | null;
  purchase_condition: string | null;
  remarks: string | null;
  min_quantity: number | null;
  min_dp_rm: number | null;
};

function promoNamePriority(name: string | null): number {
  if (name === "Customer Promo")    return 3;
  if (name === "New Launch Promo")  return 3;
  if (name === "DRPlus Promo")      return 2;
  if (name === "Central Promo")     return 1;
  return 0;
}

function deriveLotType(section: string | null): string | null {
  if (!section) return null;
  const s = section.toUpperCase();
  if (s.startsWith("SF")) return "Super Family";
  if (s.startsWith("SD")) return "Super Double";
  if (s.startsWith("F"))  return "Family";
  if (s.startsWith("S"))  return "Single";
  if (s.startsWith("TD")) return "Twin Double";
  if (s.startsWith("D"))  return "Double";
  if (s.startsWith("R"))  return "Royal";
  return null;
}

function promoLotTypes(lotType: string | null): string[] {
  if (!lotType) return [];
  return lotType.split(/[&,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

function lotRangeMatch(section: string | null, lotNum: number | null, lotRange: string | null): boolean {
  if (!lotRange) return true;

  const upper = lotRange.toUpperCase().trim();
  const parenIdx = upper.indexOf("(");
  const sectionPart = parenIdx >= 0 ? upper.slice(0, parenIdx).trim() : upper;
  const lotPart = parenIdx >= 0 ? upper.slice(parenIdx + 1).replace(")", "").trim() : null;

  let sectionOk = false;
  if (sectionPart.endsWith("*")) {
    // Prefix wildcard: e.g. 'CD*' matches CD1, CD2, CD3A, CD10, etc.
    sectionOk = (section ?? "").toUpperCase().startsWith(sectionPart.slice(0, -1));
  } else if (sectionPart.includes("~")) {
    const [from, to] = sectionPart.split("~").map(s => s.trim());
    if (from.length !== to.length) {
      sectionOk = true;
    } else {
      const sections: string[] = [];
      let cur = from;
      let safety = 0;
      while (cur <= to && safety++ < 300) {
        sections.push(cur);
        const chars = cur.split("");
        let i = chars.length - 1;
        while (i >= 0) {
          if (chars[i] < "Z") { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break; }
          chars[i] = "A";
          i--;
        }
        cur = chars.join("");
      }
      sectionOk = sections.includes((section ?? "").toUpperCase());
    }
  } else if (sectionPart.includes(",")) {
    // Comma-separated section list: e.g. 'DG,DH,DJ,SG,SJ'
    sectionOk = sectionPart.split(",").map(s => s.trim()).includes((section ?? "").toUpperCase());
  } else {
    sectionOk = (section ?? "").toUpperCase() === sectionPart;
  }

  if (!sectionOk) return false;
  if (!lotPart || lotNum == null) return true;

  if (lotPart.includes("&")) {
    return lotPart.split("&").some(s => parseInt(s.trim()) === lotNum);
  }
  return lotPart.split(",").some(segment => {
    segment = segment.trim();
    if (segment.includes("~")) {
      const [lo, hi] = segment.split("~").map(s => parseInt(s.trim()));
      return lotNum >= lo && lotNum <= hi;
    }
    return parseInt(segment) === lotNum;
  });
}

function matchPromo(row: any, promos: PromoRow[], dpPct?: number, promoFilter?: string, qty: number = 1): PromoRow | null {
  const isPackagePlot = row.product_category === "Package Plot";
  const rowSite    = (row.site  ?? "").toLowerCase();
  const rowZone    = (row.zone  ?? "").toLowerCase();
  // HC lots without pre-need price are instant case only — no promo applies
  if (rowSite === "shah alam" && rowZone.startsWith("hc") && !row.pre_need_price) return null;
  const rowSection = row.lot_section ?? row.niche_section ?? null;
  const rowLotNum  = row.lot_num ?? null;
  const rowLevel   = String(row.niche_level ?? row.price_level ?? "");

  const rawLotType = row.lot_type ?? deriveLotType(row.lot_section);
  const rowLotType = (rawLotType ?? "").toLowerCase();

  // EBL always uses the worship plan path — no promo should be attached
  if ((row.product_category ?? "").toLowerCase() === "ebl") return null;

  let candidates = promos.filter(p => {
    // Package Plot: only As-Need promo applies; all other promos are blocked
    if (isPackagePlot && p.purchase_condition !== "as_need") return false;
    const pName = (p.product_name ?? "").toLowerCase();
    const isCentralPromo = pName === "central region";
    // Southern Region sites never inherit Central Promo
    if (isCentralPromo && SOUTHERN_SITES.has(rowSite)) return false;
    if (!isCentralPromo && (p.site_code ?? "").toLowerCase() !== rowSite) return false;
    if (p.is_combo) return false;

    // Semenyih-NMP Land/Burial: Central Promo tenure applies but discount is zeroed (see post-match below)

    if (!pName) return false;
    if (!isCentralPromo) {
      if (pName !== rowZone && !rowZone.startsWith(pName) && !pName.startsWith(rowZone + "-")) return false;
    }
    if (p.excluded_product_names && p.excluded_product_names.length) {
      let exclRaw: string[] = [];
      if (Array.isArray(p.excluded_product_names)) {
        exclRaw = p.excluded_product_names;
      } else {
        try { exclRaw = JSON.parse(p.excluded_product_names); } catch { exclRaw = p.excluded_product_names.split(/[,;]/); }
      }
      if (exclRaw.map((s: string) => s.trim().toLowerCase()).includes(rowZone)) return false;
    }

    if (p.lot_type) {
      const pLotTypes = promoLotTypes(p.lot_type);
      if (pLotTypes.length && rowLotType && !pLotTypes.includes(rowLotType)) return false;
    }

    if (p.level_restriction) {
      const levels = p.level_restriction.replace(/\s/g, "").split(",");
      if (!levels.includes(rowLevel)) return false;
    }

    if (!lotRangeMatch(rowSection, rowLotNum, p.lot_range)) return false;

    // Quantity-gated rows (e.g. N12-S6 "2+ niches" tier) only match when qty meets the minimum
    if (p.min_quantity != null && qty < p.min_quantity) return false;

    // Exclude cash-only rules — shown only via dedicated full-payment selection (dpPct=100)
    if (p.purchase_condition === "cash_purchase" && dpPct !== 100) return false;

    // Purchase with Purchase (PWP) rows are excluded from regular matching.
    // Agent must explicitly select PWP mode via promoFilter to see the additional discount.
    if (p.purchase_condition === "purchase_with_purchase" && promoFilter !== "purchase_with_purchase") return false;

    // min_down_payment_pct is enforced on the frontend via the min_promo_dp warning overlay,
    // which blocks the quote matrix below the minimum DP. We do not filter here because the
    // initial lot fetch often arrives before the auto-DP-set fires (race condition), causing
    // promo: null responses that never get corrected.

    return true;
  });

  // When agent selected a specific promo type, restrict to that type only.
  // DRPlus keeps Central Promo rows too — needed for pricing inheritance below.
  if (promoFilter) {
    candidates = candidates.filter(p =>
      p.promo_name === promoFilter ||
      (promoFilter === "DRPlus Promo" && p.promo_name === "Central Promo") ||
      (promoFilter === "purchase_with_purchase" && p.purchase_condition === "purchase_with_purchase")
    );
  }

  // If a site-specific Customer/New Launch Promo ACTUALLY MATCHES this lot (passed all filters
  // including lot_range), block Central Promo fallback. Checking candidates (not all promos)
  // ensures lots whose section doesn't match the lot_range restriction still get Central Promo.
  const hasSiteSpecific = candidates.some(p =>
    !p.is_combo &&
    (p.site_code ?? "").toLowerCase() === rowSite &&
    (p.product_name ?? "").toLowerCase() !== "central region" &&
    (p.promo_name === "Customer Promo" || p.promo_name === "New Launch Promo")
  );
  if (hasSiteSpecific) {
    candidates = candidates.filter(p => (p.product_name ?? "").toLowerCase() !== "central region");
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const pa = promoNamePriority(a.promo_name);
    const pb = promoNamePriority(b.promo_name);
    if (pb !== pa) return pb - pa;
    // Prefer exact zone match over prefix match (e.g. MP3-GF rule beats MP3 rule for zone mp3-gf)
    const exactA = (a.product_name ?? "").toLowerCase() === rowZone ? 1 : 0;
    const exactB = (b.product_name ?? "").toLowerCase() === rowZone ? 1 : 0;
    if (exactB !== exactA) return exactB - exactA;
    // When multiple DP tiers match, prefer exact match to selected DP%; fallback to highest tier
    const da_dp = a.min_down_payment_pct ?? 0;
    const db_dp = b.min_down_payment_pct ?? 0;
    if (da_dp !== db_dp) {
      if (dpPct != null) {
        const aExact = da_dp === dpPct ? 1 : 0;
        const bExact = db_dp === dpPct ? 1 : 0;
        if (bExact !== aExact) return bExact - aExact;
      }
      return db_dp - da_dp;
    }
    const da = a.discount_rm ?? (a.discount_pct ?? 0);
    const db = b.discount_rm ?? (b.discount_pct ?? 0);
    return db - da;
  });

  const best = candidates[0];

  if (best.promo_name === "DRPlus Promo") {
    // Central Promo may have been removed from candidates by hasSiteSpecific filtering,
    // but DRPlus always needs Central Promo for its pricing (discount + instalment).
    // Search candidates first; fall back to the full promos list if not found there.
    let central = candidates.find(p => p.promo_name === "Central Promo");
    if (!central) {
      const centralRows = promos
        .filter(p => p.promo_name === "Central Promo" && !p.is_combo)
        .filter(p => {
          if (p.lot_type) {
            const types = promoLotTypes(p.lot_type);
            if (types.length && rowLotType && !types.includes(rowLotType)) return false;
          }
          if (p.purchase_condition === "cash_purchase" && dpPct !== 100) return false;
          return true;
        });
      // Pick the best Central Promo for this DP tier (same sort logic as main sort)
      centralRows.sort((a, b) => {
        const da = a.min_down_payment_pct ?? 0;
        const db = b.min_down_payment_pct ?? 0;
        if (da !== db) {
          if (dpPct != null) {
            const aExact = da === dpPct ? 1 : 0;
            const bExact = db === dpPct ? 1 : 0;
            if (bExact !== aExact) return bExact - aExact;
          }
          return db - da;
        }
        return (b.discount_pct ?? b.discount_rm ?? 0) - (a.discount_pct ?? a.discount_rm ?? 0);
      });
      central = centralRows.find(p => dpPct == null || (p.min_down_payment_pct ?? 0) <= dpPct) ?? null;
    }
    if (central) {
      return {
        ...central,
        promo_name: "DRPlus Promo",
        dr_plus_eligible: best.dr_plus_eligible,
        dr_plus_type: best.dr_plus_type,
        dr_plus_fixed_units: best.dr_plus_fixed_units,
      };
    }
  }

  return best;
}

// Compute the minimum DP that unlocks any promo for a given lot_type + site + product.
// Used by both the lot-by-lot and section-level response paths.
function computeMinPromoDp(
  lotType: string | null,
  promoList: PromoRow[],
  site: string,
  product: string,
  nicheSection?: string | null,
): number | null {
  const lowerSite    = site.toLowerCase();
  const lowerProduct = product.toLowerCase();

  const siteRows = promoList.filter(p =>
    !p.is_combo &&
    p.purchase_condition !== "purchase_with_purchase" &&
    p.purchase_condition !== "as_need" &&
    (p.site_code ?? "").toLowerCase() === lowerSite &&
    (p.product_name ?? "").toLowerCase() !== "" &&
    (
      (p.product_name ?? "").toLowerCase() === lowerProduct ||
      lowerProduct.startsWith((p.product_name ?? "").toLowerCase() + "-")
    ) &&
    p.min_down_payment_pct != null &&
    (!nicheSection || lotRangeMatch(nicheSection, null, p.lot_range))
  );
  if (siteRows.length > 0)
    return Math.min(...siteRows.map(p => p.min_down_payment_pct as number));

  // Southern Region sites never fall back to Central Promo for min DP.
  if (SOUTHERN_SITES.has(lowerSite)) return null;

  // No site-specific promo min DP — fall back to Central Promo floor.
  // Only apply when no Customer/New Launch Promo ACTUALLY MATCHES this specific lot.
  const hasCustomerPromo = promoList.some(p =>
    !p.is_combo &&
    (p.site_code ?? "").toLowerCase() === lowerSite &&
    (
      (p.product_name ?? "").toLowerCase() === lowerProduct ||
      lowerProduct.startsWith((p.product_name ?? "").toLowerCase() + "-")
    ) &&
    (p.promo_name === "Customer Promo" || p.promo_name === "New Launch Promo") &&
    (!nicheSection || lotRangeMatch(nicheSection, null, p.lot_range))
  );
  if (hasCustomerPromo) return null;

  const productLotType = (lotType ?? "").toLowerCase();
  const centralFloor = promoList
    .filter(p =>
      p.promo_name === "Central Promo" && !p.is_combo &&
      p.min_down_payment_pct != null &&
      p.purchase_condition !== "cash_purchase" &&
      (!p.lot_type || (!!productLotType && promoLotTypes(p.lot_type).includes(productLotType)))
    )
    .map(p => p.min_down_payment_pct as number);
  return centralFloor.length > 0 ? Math.min(...centralFloor) : null;
}

function isLandCategory(cat: string | null | undefined): boolean {
  const c = (cat ?? "").toLowerCase();
  return c === "land" || c === "burial plot" || c === "burial plot (christian)";
}

// For Semenyih-NMP land/burial: Central Promo instalment tenure applies but no discount
function applyLandPromoOverride(
  resolvedPromo: (PromoRow & { max_instalment_months: number | null }) | null,
  site: string,
  productCategory: string | null | undefined,
): (PromoRow & { max_instalment_months: number | null }) | null {
  if (!resolvedPromo) return null;
  if (site !== "Semenyih-NMP") return resolvedPromo;
  if (!isLandCategory(productCategory)) return resolvedPromo;
  const isCentral = (resolvedPromo.site_code ?? "").toLowerCase() !== "semenyih-nmp";
  if (!isCentral) return resolvedPromo;
  return { ...resolvedPromo, discount_rm: null, discount_pct: null };
}

function resolveInstalmentMonths(promo: PromoRow, grossPrice: number): number | null {
  if (promo.instalment_tiers?.length) {
    for (const tier of promo.instalment_tiers) {
      const months = (tier as any).max_months ?? (tier as any).months ?? null;
      if (months == null) continue;
      if (tier.max_price == null || grossPrice <= tier.max_price) return months;
    }
  }
  return promo.max_instalment_months ?? null;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p       = request.nextUrl.searchParams;
  const site    = p.get("site")    ?? "";
  const product = p.get("product") ?? "";
  const block   = p.get("block")   ?? "";
  const section = p.get("section") ?? "";
  const lvls    = p.get("levels")  ?? "";
  const dpParam  = p.get("dp");
  const lotParam = p.get("lot");
  const qtyParam = p.get("qty");
  const promo    = p.get("promo")  ?? "";
  const nicheSection = p.get("niche_section") ?? null;
  const dpPct    = dpParam  ? parseInt(dpParam,  10) : undefined;
  const qty      = qtyParam ? parseInt(qtyParam, 10) : 1;
  const specificLotNum = lotParam ? parseInt(lotParam, 10) : null;
  const selectedLevels = lvls ? lvls.split(",") : [];

  // section may be empty for pet niche lots which filter by level only (not niche_section)
  if (!site || !product || !block || (!section && !lvls))
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });

  // For section-variant products (e.g. "EBL-A"), strip the single-letter suffix to get
  // the real product name ("EBL") used in product_price_list lookups.
  const _lastDash   = product.lastIndexOf("-");
  const _suffix     = _lastDash > 0 ? product.slice(_lastDash + 1) : "";
  const baseProduct = (_suffix.length <= 2 && /^[A-Za-z]+$/.test(_suffix))
    ? product.slice(0, _lastDash)
    : product;

  const today = new Date().toISOString().slice(0, 10);

  // Hoisted so both the DB query builder and the sectionRows JS filter can use them.
  const isBurialSection  = /^[A-Za-z~-]+$/.test(section);
  const isBurialLotRange = section.includes('('); // e.g. "FA~FH (8~118)" — virtual promo-card section
  // Pet Niche levels are purely numeric (e.g. '1', '2'). Like burial sections they must NOT be
  // pushed to DB as niche_section (which is NULL for pet niches). Matched in JS via price_level.
  const isPetNicheSection = /^\d+$/.test(section);

  const [siteRes, promoRes, availRes, wpRes, dirRes, capRes, tombOptRes] = await Promise.all([
    supabaseAdmin.from("sites").select("*").eq("site_code", site).maybeSingle(),
    supabaseAdmin.from("promo_match_rules").select("*")
      .eq("active", true)
      .lte("promo_start_date", today)
      .gte("promo_end_date", today),
    (() => {
      // When section is a simple name (no slashes), push it to the DB query to avoid
      // fetching all sections for large zones (PostgREST default cap is 1000 rows).
      let q = supabaseAdmin.from("product_availability_with_price")
        .select("price_block, price_section_group, price_level, price_lot_no, pre_need_price, as_need_price, total_pre_need_price, trust_account_facility, backwall_cost, lot_type, lot_section, lot_num, niche_section, niche_level, product_category, size_description, point_value")
        .eq("site", site)
        .eq("zone", product)
        .eq("available", true)
        .not("price_list_id", "is", null);
      // Only push section to DB for niche sections (never for burial lot ranges like "DA~DR" or
      // single burial sections like "DA", "FB" which are alpha-only and have niche_section=null).
      // Burial sections are purely alphabetic (no digits). Niche sections contain digits (e.g. "S1", "D2").
      // Burial lot-range virtual sections (e.g. "FA~FH (8~118)") contain "(" and are handled in JS.
      // Slash-delimited groups (e.g. "S1/S8/S9/S13A") must use .in() to avoid the PostgREST
      // 1000-row server cap cutting off sections that sort later alphabetically.
      if (section && !isBurialSection && !isBurialLotRange && !isPetNicheSection) {
        if (section.includes('/')) {
          q = q.in("niche_section", section.split('/'));
        } else if (!section.includes(',') && !section.includes(' ')) {
          q = q.eq("niche_section", section);
        }
      }
      return q.limit(10000);
    })(),
    supabaseAdmin.from("product_price_list")
      .select("size_description, pre_need_price, as_need_price, trust_account_facility")
      .eq("site_code", site)
      .eq("product_name", baseProduct)
      .not("size_description", "is", null)
      .eq("active", true),
    supabaseAdmin.from("zone_layouts").select("direction").eq("site_code", site).eq("zone", product).maybeSingle(),
    supabaseAdmin.from("product_price_list")
      .select("lot_type, bury_capacity")
      .eq("site_code", site)
      .eq("product_name", product)
      .eq("active", true)
      .not("bury_capacity", "is", null),
    supabaseAdmin.from("tomb_options")
      .select("tomb_code, tomb_name, price, discount, sort_order")
      .eq("site_code", site)
      .eq("product_name", product)
      .order("sort_order", { ascending: true }),
  ]);

  const siteInfo     = siteRes.data;
  const promoList: PromoRow[] = promoRes.data ?? [];
  let allRows        = availRes.data ?? [];
  const worshipPlans = wpRes.data ?? [];
  const zoneDirection = dirRes.data?.direction ?? null;
  const tombOptions  = (!tombOptRes.error && (tombOptRes.data ?? []).length > 0) ? tombOptRes.data : null;
  const buryCapMap: Record<string, number> = {};
  (capRes.data ?? []).forEach((r: any) => {
    if (r.bury_capacity != null) buryCapMap[r.lot_type ?? ''] = r.bury_capacity;
  });

  // When a zone_layouts sub-zone name (e.g. 'BK-A-LG1-HB-S3A-D6, D7, D8, D9, D10') is selected,
  // the actual lots live under the parent zone ('BK-A-LG1-HB-S3A') in product_availability_with_price.
  // Detect this by checking for a comma in the product name and retrying with the base zone.
  let effectiveZone = product;
  if (!allRows.length && product.includes(',')) {
    const baseZone = product.replace(/-[^-,]+(?:,.*)?$/, '');
    if (baseZone !== product) {
      // Apply niche_section filter to avoid the PostgREST 1000-row server cap cutting off
      // sections that sort later alphabetically (e.g. S1, S8, S9 after D2~D15 in BK-A-LG1-HG).
      let retryQ = supabaseAdmin
        .from("product_availability_with_price")
        .select("price_block, price_section_group, price_level, price_lot_no, pre_need_price, as_need_price, total_pre_need_price, trust_account_facility, backwall_cost, lot_type, lot_section, lot_num, niche_section, niche_level, product_category, size_description, point_value")
        .eq("site", site)
        .eq("zone", baseZone)
        .eq("available", true)
        .not("price_list_id", "is", null);
      if (section && !isBurialSection && !isBurialLotRange && !isPetNicheSection) {
        if (section.includes('/')) {
          retryQ = retryQ.in("niche_section", section.split('/'));
        } else if (!section.includes(',') && !section.includes(' ')) {
          retryQ = retryQ.eq("niche_section", section);
        }
      }
      const { data: retryRows } = await retryQ.limit(10000);
      if (retryRows?.length) { allRows = retryRows; effectiveZone = baseZone; }
    }
  }

  // Filter to rows matching this section
  const sectionRows = allRows.filter((r: any) => {
    // EBL is flat-priced via the fallback path — niche_section is a view artifact, not a real level
    if ((r.product_category ?? "").toLowerCase() === "ebl") return false;
    if (r.niche_section != null) {
      // Only filter by price_block if it's populated — EBL/pedestal may have null price_block
      if (r.price_block != null && r.price_block !== block && r.price_block !== effectiveZone) return false;
      // If no price_section_group, match on niche_section directly (e.g. EBL lots)
      if (r.price_section_group == null) return r.niche_section === section;
      if (r.price_section_group === section) return true;
      // Simple section name (no slashes): match by niche_section for accuracy.
      // Slash-delimited group name: check if section is a segment within it.
      if (!section.includes('/')) return r.niche_section === section;
      if (('/' + r.price_section_group + '/').includes('/' + section + '/')) return true;
      return false;
    } else {
      // Pet Niche: niche_section is null but price_level holds the level (e.g. '1', '2').
      if (isPetNicheSection && (r.product_category ?? "").toLowerCase() === "pet niche") {
        return (r.price_level ?? "") === section;
      }
      const sec = section.toUpperCase();
      if (r.price_section_group) {
        const pg = (r.price_section_group as string).toUpperCase();
        if (pg === sec) return true;
        // Klang pedestal: section_group stores comma-separated levels (e.g. "1,2,3,3A,5,6,6A").
        // Zone layout passes the level as section (e.g. "01" → "1"). Strip leading zeros and check membership.
        if (site === 'Klang') {
          const secNorm = sec.replace(/^0+/, '') || sec;
          const vals = pg.split(',').map((s: string) => s.trim());
          if (vals.includes(sec) || vals.includes(secNorm)) return true;
        }
      }
      if (r.price_lot_no) {
        const m = (r.price_lot_no as string).toUpperCase().match(/^([A-Z~]+)/);
        if (m && m[1] === sec) return true;
      }
      return (r.lot_section ?? "").toUpperCase() === sec;
    }
  });

  // Package Plot: fetch hole_excavation_fees + tomb_price from product_price_list directly.
  // These columns exist in the DB but are not exposed via PostgREST's view SELECT cache.
  const ppExtraMap: Record<string, { hole_excavation_fees: number | null; tomb_price: number | null }> = {};
  if (sectionRows.length && ["Package Plot", "Urn Burial"].includes(sectionRows[0].product_category)) {
    const { data: ppExtra } = await supabaseAdmin
      .from("product_price_list")
      .select("lot_no, hole_excavation_fees, tomb_price")
      .eq("site_code", site)
      .eq("product_name", product)
      .eq("active", true);
    (ppExtra ?? []).forEach((r: any) => {
      if (r.lot_no) ppExtraMap[r.lot_no] = { hole_excavation_fees: r.hole_excavation_fees ?? null, tomb_price: r.tomb_price ?? null };
    });
  }

  if (!sectionRows.length) {
    // Fallback: misc products (EBL, Pedestal, NLP) where price_list_id is null in the view.
    // Query product_price_list directly for the flat price row (size_description IS NULL = standard row).
    // baseProduct already strips section suffix (e.g. "EBL-A" → "EBL") — computed above.
    let directQuery = supabaseAdmin
      .from("product_price_list")
      .select("pre_need_price, as_need_price, trust_account_facility, backwall_cost, product_category, point_value")
      .eq("site_code", site)
      .eq("product_name", baseProduct)
      .is("size_description", null)
      .eq("active", true);
    if (section) directQuery = directQuery.eq("section_group", section);
    let { data: directRows } = await directQuery.limit(1);

    // If no match with section filter, retry without — handles products like EBL
    // where price_list_id is null in the view and section_group is not set.
    if (!directRows?.length && section) {
      const { data: noSectionRows } = await supabaseAdmin
        .from("product_price_list")
        .select("pre_need_price, as_need_price, trust_account_facility, backwall_cost, product_category, point_value")
        .eq("site_code", site)
        .eq("product_name", baseProduct)
        .is("size_description", null)
        .eq("active", true)
        .limit(1);
      directRows = noSectionRows ?? directRows;
    }

    if (!directRows?.length)
      return NextResponse.json({ error: "No available lots found for this section" }, { status: 404 });

    const dr = directRows[0];
    const nlpPromos = promoList.filter((p: PromoRow) =>
      (p.product_name ?? "").toLowerCase() === "nlp"
    );

    const directPromo = matchPromo(
      { site, zone: product, lot_section: section || null, lot_num: null,
        lot_type: null, niche_level: null, price_level: null,
        product_category: dr.product_category ?? "" },
      promoList, dpPct, promo || undefined, qty
    );
    const resolvedDirectPromo = directPromo ? {
      ...directPromo,
      max_instalment_months: resolveInstalmentMonths(directPromo, dr.pre_need_price ?? 0),
    } : null;

    if (product === "NLP") {
      await supabaseAdmin.from("debug_logs").insert({
        tag: "nlp-pricing",
        payload: {
          site, product, section, preNeedPrice: dr.pre_need_price,
          product_category: dr.product_category,
          directPromo, resolvedDirectPromo,
        },
      });
    }

    const pwpPromoDirect = promoList.find((p: PromoRow) =>
      p.purchase_condition === "purchase_with_purchase" && !p.is_combo &&
      (p.site_code ?? "").toLowerCase() === site.toLowerCase() &&
      (p.product_name ?? "").toLowerCase() === product.toLowerCase()
    ) ?? null;
    const hasPwpDirect = pwpPromoDirect != null;
    const siteProductPromosDirect = promoList.filter((p: PromoRow) =>
      !p.is_combo && p.purchase_condition !== "purchase_with_purchase" &&
      p.purchase_condition !== "as_need" &&
      (p.site_code ?? "").toLowerCase() === site.toLowerCase() &&
      (p.product_name ?? "").toLowerCase() === product.toLowerCase() &&
      p.min_down_payment_pct != null
    );
    const minPromoDpDirect = siteProductPromosDirect.length > 0
      ? Math.min(...siteProductPromosDirect.map((p: PromoRow) => p.min_down_payment_pct as number))
      : null;

    return NextResponse.json({
      site,
      site_name_en:    siteInfo?.site_name_en ?? site,
      site_name_zh:    siteInfo?.site_name_zh ?? "",
      tenure:          siteInfo?.tenure ?? null,
      direction:       zoneDirection,
      bury_capacity_map: buryCapMap,
      product,
      product_category: dr.product_category ?? "",
      block,
      section,
      lot_type:        null,
      levels: [{
        level:                  null,
        lot_no:                 null,
        lot_type:               null,
        pre_need_price:         dr.pre_need_price ?? null,
        as_need_price:          dr.as_need_price  ?? null,
        trust_account_facility: dr.trust_account_facility ?? 0,
        backwall_cost:          dr.backwall_cost  ?? 0,
        point_value:            dr.point_value ?? 0,
        product_category:       dr.product_category ?? "",
        promo:                  resolvedDirectPromo,
        available_count:        1,
      }],
      tomb_options:    tombOptions,
      worship_plans:   worshipPlans,
      nlp_promos:      nlpPromos,
      has_pwp_option:  hasPwpDirect,
      pwp_promo:       pwpPromoDirect ? {
        promo_name:            pwpPromoDirect.promo_name,
        discount_rm:           pwpPromoDirect.discount_rm,
        max_instalment_months: pwpPromoDirect.max_instalment_months,
        min_down_payment_pct:  pwpPromoDirect.min_down_payment_pct,
      } : null,
      min_promo_dp:    minPromoDpDirect,
    });
  }

  // Pedestal rows have niche_section=null (same as burial) but must group by price_level, not price_lot_no.
  const isBurial  = sectionRows[0].niche_section == null
    && !['pedestal', 'pet niche'].includes((sectionRows[0].product_category ?? '').toLowerCase());
  const firstRow  = sectionRows[0];

  // ── Lot-by-lot mode: when a specific burial lot is selected from the layout grid ──
  // Instead of returning all price brackets for the section, find the exact row and
  // return one level with its own promo match. This is correct because the agent selects
  // individual lots; price bracket grouping is only needed for the batch/combo route.
  if (specificLotNum != null && isBurial && sectionRows.some((r: any) => r.lot_num != null)) {
    const specificRow = sectionRows.find((r: any) => r.lot_num === specificLotNum);
    if (!specificRow) {
      return NextResponse.json({ error: "Lot not found in section" }, { status: 404 });
    }
    const lotType = specificRow.lot_type ?? deriveLotType(specificRow.lot_section);
    const preNeed = specificRow.pre_need_price ?? 0;
    const groupKey = specificRow.price_lot_no ?? "std";
    const promoMatch = matchPromo({
      site, zone: product,
      pre_need_price: specificRow.pre_need_price ?? null,
      lot_section:    specificRow.lot_section   ?? null,
      niche_section:  null,
      lot_num:        specificLotNum,
      niche_level:    null,
      price_level:    null,
      lot_type:       lotType,
      product_category: specificRow.product_category ?? null,
    }, promoList, dpPct, promo || undefined, qty);
    const resolvedPromo = applyLandPromoOverride(promoMatch ? {
      ...promoMatch,
      max_instalment_months: resolveInstalmentMonths(promoMatch, preNeed),
    } : null, site, specificRow.product_category);
    return NextResponse.json({
      site,
      site_name_en:    siteInfo?.site_name_en ?? site,
      site_name_zh:    siteInfo?.site_name_zh ?? "",
      tenure:          siteInfo?.tenure ?? null,
      direction:       zoneDirection,
      bury_capacity_map: buryCapMap,
      product,
      product_category: specificRow.product_category ?? "",
      size_description: specificRow.size_description ?? "",
      block,
      section,
      lot_type:        lotType ?? "",
      levels: [{
        level:                  null,
        lot_no:                 groupKey,
        lot_type:               lotType,
        pre_need_price:         specificRow.pre_need_price         ?? null,
        as_need_price:          specificRow.as_need_price          ?? null,
        total_pre_need_price:   specificRow.total_pre_need_price   ?? null,
        trust_account_facility: specificRow.trust_account_facility ?? 0,
        backwall_cost:          specificRow.backwall_cost          ?? 0,
        point_value:            specificRow.point_value            ?? 0,
        hole_excavation_fees:   ppExtraMap[groupKey]?.hole_excavation_fees ?? null,
        tomb_price:             ppExtraMap[groupKey]?.tomb_price           ?? null,
        product_category:       specificRow.product_category       ?? "",
        size_description:       specificRow.size_description       ?? null,
        promo:                  resolvedPromo,
        available_count:        1,
      }],
      tomb_options:  tombOptions,
      worship_plans: worshipPlans,
      min_promo_dp: computeMinPromoDp(lotType, promoList, site, product, nicheSection),
    });
  }

  // Group by price tier
  const groupMap: Record<string, any[]> = {};
  sectionRows.forEach((r: any) => {
    const key = isBurial ? (r.price_lot_no ?? "std") : (r.price_level ?? "std");
    // Apply optional level filter for niches
    // Shah Alam pedestal: price_level may be a comma-separated range (e.g. "15,16,17")
    // covering multiple floors — split and check membership instead of exact match.
    if (!isBurial && selectedLevels.length) {
      if (site === 'Shah Alam' || site === 'Klang') {
        const keyParts = key.split(',').map((s: string) => s.trim());
        if (!keyParts.some((k: string) => selectedLevels.includes(k))) return;
      } else {
        if (!selectedLevels.includes(key)) return;
      }
    }
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(r);
  });

  const levels = Object.entries(groupMap).map(([groupKey, rows]) => {
    // When agent selects a specific niche lot, niche_section is passed so we use a row
    // from that exact section as rep — avoids lot_range mismatch when a section group
    // (e.g. DA/DD/DG/DH) mixes promo-eligible and non-eligible sections.
    const rep = nicheSection
      ? (rows.find((r: any) => (r.niche_section ?? "").toLowerCase() === nicheSection.toLowerCase()) ?? rows[0])
      : rows[0];
    const lotType = rep.lot_type ?? (isBurial ? deriveLotType(rep.lot_section) : null);
    const preNeed = rep.pre_need_price ?? 0;
    const promoMatch = matchPromo({
      site,
      zone:             product,
      pre_need_price:   rep.pre_need_price ?? null,
      lot_section:      rep.lot_section   ?? null,
      niche_section:    rep.niche_section ?? null,
      lot_num:          rep.lot_num       ?? null,
      niche_level:      rep.niche_level   ?? rep.price_level ?? null,
      price_level:      rep.price_level   ?? null,
      lot_type:         lotType,
      product_category: rep.product_category ?? null,
    }, promoList, dpPct, promo || undefined, qty);

    const resolvedPromo = applyLandPromoOverride(promoMatch ? {
      ...promoMatch,
      max_instalment_months: resolveInstalmentMonths(promoMatch, preNeed),
    } : null, site, rep.product_category);

    return {
      level:                  isBurial ? null     : groupKey,
      lot_no:                 isBurial ? groupKey : null,
      lot_type:               lotType,
      pre_need_price:         rep.pre_need_price         ?? null,
      as_need_price:          rep.as_need_price          ?? null,
      total_pre_need_price:   rep.total_pre_need_price   ?? null,
      trust_account_facility: rep.trust_account_facility ?? 0,
      backwall_cost:          rep.backwall_cost          ?? 0,
      point_value:            rep.point_value            ?? 0,
      hole_excavation_fees:   ppExtraMap[groupKey]?.hole_excavation_fees ?? null,
      tomb_price:             ppExtraMap[groupKey]?.tomb_price           ?? null,
      product_category:       rep.product_category       ?? "",
      size_description:       rep.size_description       ?? null,
      promo:                  resolvedPromo,
      available_count:        rows.length,
    };
  });

  levels.sort((a: any, b: any) => {
    if (!isBurial) {
      const an = parseFloat(a.level), bn = parseFloat(b.level);
      if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
      return String(a.level).localeCompare(String(b.level));
    }
    return String(a.lot_no).localeCompare(String(b.lot_no));
  });

  // Find As-Need promo to expose its discount_pct for client-side discount row display
  const asNeedPromo = promoList.find((p: PromoRow) => p.purchase_condition === "as_need" && !p.is_combo);

  // Signal to client when a PWP (Purchase with Purchase) promo row exists for this product.
  const pwpPromoRow = promoList.find((p: PromoRow) =>
    p.purchase_condition === "purchase_with_purchase" &&
    !p.is_combo &&
    (p.site_code ?? "").toLowerCase() === site.toLowerCase() &&
    (
      (p.product_name ?? "").toLowerCase() === product.toLowerCase() ||
      product.toLowerCase().startsWith((p.product_name ?? "").toLowerCase() + "-")
    )
  ) ?? null;
  const hasPwpOption = pwpPromoRow != null;

  // Minimum DP required to unlock any promo for this product.
  // Derived from the lowest min_down_payment_pct across all active, non-PWP, non-combo rows
  // that match this site+product. Null means no restriction (any DP is fine).
  const siteProductPromos = promoList.filter((p: PromoRow) =>
    !p.is_combo &&
    p.purchase_condition !== "purchase_with_purchase" &&
    p.purchase_condition !== "as_need" &&
    (p.site_code ?? "").toLowerCase() === site.toLowerCase() &&
    (p.product_name ?? "").toLowerCase() !== "" &&
    (
      (p.product_name ?? "").toLowerCase() === product.toLowerCase() ||
      product.toLowerCase().startsWith((p.product_name ?? "").toLowerCase() + "-")
    ) &&
    p.min_down_payment_pct != null
  );
  const productLotType = firstRow?.lot_type ?? deriveLotType(firstRow?.lot_section) ?? null;
  const minPromoDp = computeMinPromoDp(productLotType, promoList, site, product, nicheSection);

  // qty_tiers: quantity thresholds that change the required DP and instalment cap.
  // e.g. [{ min_quantity: 2, min_dp: 10, max_months: 60 }] means: when qty >= 2, switch to 10% DP / 60 mths.
  // Sorted descending so the frontend can walk down and find the first matching tier.
  const qtyTieredPromos = siteProductPromos.filter((p: PromoRow) => p.min_quantity != null);
  const qtyBaseDpRows   = siteProductPromos.filter((p: PromoRow) => p.min_quantity == null);
  const qtyBaseDp = qtyBaseDpRows.length > 0
    ? Math.max(...qtyBaseDpRows.map((p: PromoRow) => p.min_down_payment_pct as number))
    : null;
  const qtyTiers = qtyTieredPromos.length > 0
    ? [...new Map(qtyTieredPromos.map((p: PromoRow) => [p.min_quantity, {
        min_quantity:  p.min_quantity,
        min_dp:        p.min_down_payment_pct,
        max_months:    p.max_instalment_months,
      }])).values()].sort((a: any, b: any) => b.min_quantity - a.min_quantity)
    : null;

  // All distinct promos available for this product — for the "available promos" display above the matrix.
  // Includes cash_purchase (full payment) rows; excludes combo/PWP/as_need.
  // If exact product_name rows exist, exclude prefix-match rows (e.g. 'MP3' rows must not bleed into 'MP3-2F-RS1').
  const _promoSummaryRaw = promoList.filter((p: PromoRow) =>
    !p.is_combo &&
    p.purchase_condition !== "purchase_with_purchase" &&
    p.purchase_condition !== "as_need" &&
    (p.site_code ?? "").toLowerCase() === site.toLowerCase() &&
    (p.product_name ?? "").toLowerCase() !== "" &&
    (
      (p.product_name ?? "").toLowerCase() === product.toLowerCase() ||
      product.toLowerCase().startsWith((p.product_name ?? "").toLowerCase() + "-")
    )
  );
  const _hasExactPromoMatch = _promoSummaryRaw.some((p: PromoRow) =>
    (p.product_name ?? "").toLowerCase() === product.toLowerCase()
  );
  const promoSummary = (_hasExactPromoMatch
    ? _promoSummaryRaw.filter((p: PromoRow) => (p.product_name ?? "").toLowerCase() === product.toLowerCase())
    : _promoSummaryRaw
  )
    .map((p: PromoRow) => ({
      promo_name:           p.promo_name,
      purchase_condition:   p.purchase_condition,
      min_down_payment_pct: p.min_down_payment_pct,
      discount_rm:          p.discount_rm,
      discount_pct:         p.discount_pct,
      max_instalment_months: p.max_instalment_months,
      promo_end_date:       p.promo_end_date,
      lot_type:             p.lot_type,
      level_restriction:    p.level_restriction,
      lot_range:            p.lot_range,
      min_dp_rm:            p.min_dp_rm,
    }))
    .sort((a: any, b: any) => {
      // instalment rows first, full-payment rows last
      const aFull = a.purchase_condition === "cash_purchase" ? 1 : 0;
      const bFull = b.purchase_condition === "cash_purchase" ? 1 : 0;
      if (aFull !== bFull) return aFull - bFull;
      return (a.min_down_payment_pct ?? 0) - (b.min_down_payment_pct ?? 0);
    });

  return NextResponse.json({
    site,
    site_name_en:    siteInfo?.site_name_en ?? site,
    site_name_zh:    siteInfo?.site_name_zh ?? "",
    tenure:          siteInfo?.tenure ?? null,
    direction:       zoneDirection,
    bury_capacity_map: buryCapMap,
    product,
    product_category: firstRow.product_category ?? "",
    size_description: firstRow.size_description ?? "",
    block,
    section,
    lot_type:        firstRow.lot_type ?? (isBurial ? deriveLotType(firstRow.lot_section) : null) ?? "",
    levels,
    tomb_options:    tombOptions,
    worship_plans:   worshipPlans,
    as_need_discount_pct: asNeedPromo?.discount_pct ?? null,
    has_pwp_option:  hasPwpOption,
    pwp_promo:       pwpPromoRow ? {
      promo_name:            pwpPromoRow.promo_name,
      discount_rm:           pwpPromoRow.discount_rm,
      max_instalment_months: pwpPromoRow.max_instalment_months,
      min_down_payment_pct:  pwpPromoRow.min_down_payment_pct,
    } : null,
    min_promo_dp:      minPromoDp,
    qty_tiers:         qtyTiers,
    qty_tiers_base_dp: qtyBaseDp,
    promo_summary:     (() => { const ps = nicheSection ? promoSummary.filter((p: any) => lotRangeMatch(nicheSection, null, p.lot_range)) : promoSummary; return ps.length > 0 ? ps : null; })(),
  });
}
