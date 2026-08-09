import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TYPE_LABELS: Record<string, string> = {
  "NICHE":            "Niche",
  "BURIAL PLOT":      "Land Plot",
  "URN BURIAL PLOT":  "Urn Plot",
  "PET NICHE":        "Pet Niche",
  "PEDESTAL":         "AT",
  "HALL":             "Hall",
  "EBL":              "EBL",
};

const PREFIX_LABELS: Record<string, string> = {
  S:   "Single",
  D:   "Double",
  TD:  "Twin Double",
  SF:  "Super Family",
  F:   "Family",
  R:   "Royal",
  A:   "Special",
};

function typeLabel(key: string): string {
  return TYPE_LABELS[key] ?? (key.charAt(0).toUpperCase() + key.slice(1));
}

// ── Promo highlight helpers ───────────────────────────────────────────────────


// Build a map of groupKey → Set<lot_type | null> from a sample of available lots.
// Used to accurately determine which promos apply per zone/site.
function buildLotTypeMap(lots: any[], keyFn: (r: any) => string): Record<string, Set<string | null>> {
  const map: Record<string, Set<string | null>> = {};
  for (const r of lots) {
    const k = keyFn(r);
    if (!k) continue;
    if (!map[k]) map[k] = new Set();
    map[k].add(r.lot_type ? (r.lot_type as string).toLowerCase() : null);
  }
  return map;
}

// Given a set of lot_types present in a zone/site and a list of active promos,
// return the distinct promo names that actually apply.
function resolvePromoTypes(
  lotTypes: Set<string | null>,
  categories: Set<string>,
  promos: any[],
  siteFilter: string,         // lowercase site name; empty = skip site filter (central promo bypass)
  zoneFilter: string,         // lowercase zone name; empty = site-level (all zones)
): string[] {
  const sl = siteFilter;
  const zl = zoneFilter;
  const names = promos.filter((p: any) => {
    const pn = (p.product_name ?? "").toLowerCase();
    const isCentral = pn === "central region";

    // Zone/site match
    if (!isCentral) {
      if (sl && (p.site_code ?? "").toLowerCase() !== sl) return false;
      if (zl && pn !== zl && !zl.startsWith(pn) && !pn.startsWith(zl + "-")) return false;
    }

    // Central Promo: exclude EBL product category
    if (isCentral && categories.has("ebl")) return false;

    // Lot-type compatibility: only apply at zone level (zl !== "").
    // At site level (zl === "") we show all promo types regardless of lot_type so the
    // badge list is consistent across product types (niche, burial, pedestal, etc.).
    if (p.lot_type && zl !== "") {
      const hasLotTypeData = [...lotTypes].some(lt => lt != null);
      if (hasLotTypeData) {
        const pTypes = (p.lot_type as string).split(/[&,]/).map((s: string) => s.trim().toLowerCase());
        if (![...lotTypes].some(lt => lt != null && pTypes.includes(lt))) return false;
      }
    }

    return true;
  }).map((p: any) => p.promo_name as string).filter(Boolean);

  const unique = [...new Set(names)];
  // Combo Lot is additive — always show it alongside the winning promo.
  // For all other promos, only show the highest priority one (Customer > DRPlus > Central)
  // so Central Promo doesn't clutter every zone that already has a higher-tier promo.
  const comboLot = unique.filter(n => n.toLowerCase().includes("combo"));
  const tiered   = unique.filter(n => !n.toLowerCase().includes("combo"));
  tiered.sort((a, b) => promoNamePriority(b) - promoNamePriority(a));
  // Site-level (no zoneFilter): show all distinct promo types so agents can see everything available.
  // Zone-level: show only the winning promo to avoid clutter (Central doesn't show when higher-tier exists).
  const winners = zoneFilter === "" ? tiered.filter(n => n !== "Central Promo") : (tiered.length ? [tiered[0]] : []);
  return [...winners, ...comboLot];
}

function promoNamePriority(name: string | null): number {
  if (name === "Customer Promo")   return 3;
  if (name === "New Launch Promo") return 3;
  if (name === "DRPlus Promo")     return 2;
  if (name === "Central Promo")    return 1;
  return 0;
}

function deriveLotTypeFromPrefix(prefix: string): string | null {
  const u = prefix.toUpperCase();
  if (u.startsWith("SF")) return "super family";
  if (u.startsWith("SD")) return "super double";
  if (u.startsWith("F"))  return "family";
  if (u.startsWith("S"))  return "single";
  if (u.startsWith("TD")) return "twin double";
  if (u.startsWith("D"))  return "double";
  if (u.startsWith("R"))  return "royal";
  return null;
}

// Section-only lotRange match (ignores lot number — used at the section/row level in the drawer).
function sectionInRange(section: string, lotRange: string): boolean {
  const upper = lotRange.toUpperCase().trim();
  const parenIdx = upper.indexOf("(");
  const sectionPart = parenIdx >= 0 ? upper.slice(0, parenIdx).trim() : upper;
  if (sectionPart.includes("~")) {
    const [from, to] = sectionPart.split("~").map(s => s.trim());
    if (from.length !== to.length) return true; // mixed length — assume match
    const sections: string[] = [];
    let cur = from; let safety = 0;
    while (cur <= to && safety++ < 300) {
      sections.push(cur);
      const chars = cur.split("");
      let i = chars.length - 1;
      while (i >= 0) {
        if (chars[i] < "Z") { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break; }
        chars[i] = "A"; i--;
      }
      cur = chars.join("");
    }
    return sections.includes(section.toUpperCase());
  }
  return section.toUpperCase() === sectionPart;
}

type PromoHighlight = {
  promo_name: string;
  dp_min: number | null;
  dp_max: number | null;
  disc_min: number | null;
  disc_max: number | null;
};

async function fetchZonePromos(site: string, zone: string): Promise<any[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin.from("promo_match_rules")
    .select("promo_name, site_code, product_name, lot_type, lot_range, level_restriction, min_down_payment_pct, discount_pct, is_combo")
    .eq("active", true)
    .lte("promo_start_date", today)
    .gte("promo_end_date", today);
  const zl = zone.toLowerCase(), sl = site.toLowerCase();
  return (data ?? []).filter((p: any) => {
    if (p.is_combo) return false;
    const pn = (p.product_name ?? "").toLowerCase();
    if (pn === "central region") return true;
    if ((p.site_code ?? "").toLowerCase() !== sl) return false;
    return pn === zl || zl.startsWith(pn) || pn.startsWith(zl + "-");
  });
}

function buildPromoHighlight(candidates: any[]): PromoHighlight | null {
  if (!candidates.length) return null;
  candidates.sort((a, b) => promoNamePriority(b.promo_name) - promoNamePriority(a.promo_name));
  const topName = candidates[0].promo_name;

  // DRPlus Promo stores no dp/disc (they're always null) — it inherits Central Promo pricing.
  // Use the Central Promo rows' rates for the label so agents see the actual dp/disc info.
  const rateRows = topName === "DRPlus Promo"
    ? candidates.filter((r: any) => r.promo_name === "Central Promo")
    : candidates.filter((r: any) => r.promo_name === topName);

  const dpVals = rateRows.map((r: any) => r.min_down_payment_pct).filter((v: any) => v != null) as number[];
  // Central Promo stores discount_pct=null; discount equals the dp% — use dp as fallback.
  const discVals = rateRows.map((r: any) =>
    r.discount_pct ?? (r.promo_name === "Central Promo" ? r.min_down_payment_pct : null)
  ).filter((v: any) => v != null) as number[];

  return {
    promo_name: topName,
    dp_min:   dpVals.length   ? Math.min(...dpVals)   : null,
    dp_max:   dpVals.length   ? Math.max(...dpVals)   : null,
    disc_min: discVals.length ? Math.min(...discVals) : null,
    disc_max: discVals.length ? Math.max(...discVals) : null,
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p     = request.nextUrl.searchParams;
  const step  = p.get("step") ?? "types";
  const type  = p.get("type") ?? "";
  const site  = p.get("site") ?? "";
  const level = p.get("level") ?? "";

  // ── Step 1: distinct product types with total available count ──
  if (step === "types") {
    const { data, error } = await supabaseAdmin.rpc("get_available_by_type");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const types = (data ?? []).map((r: any) => ({
      key:       r.product_type as string,
      label:     typeLabel(r.product_type as string),
      available: Number(r.available),
    }));

    return NextResponse.json({ types });
  }

  // ── Step 2: sites that have this product type available ──
  if (step === "sites") {
    const today = new Date().toISOString().slice(0, 10);
    const [rpcRes, promoRes, lotRes, bundleSitesRes] = await Promise.all([
      supabaseAdmin.rpc("get_available_sites", { p_type: type }),
      supabaseAdmin.from("promo_match_rules")
        .select("promo_name, site_code, product_name, lot_type, is_combo")
        .eq("active", true)
        .lte("promo_start_date", today)
        .gte("promo_end_date", today),
      supabaseAdmin.from("product_availability_with_price")
        .select("site, lot_type, product_category")
        .eq("product_type", type)
        .eq("available", true)
        .not("price_list_id", "is", null)
        .limit(3000),
      supabaseAdmin.from("bundle_promo_options")
        .select("site_code")
        .eq("active", true)
        .lte("promo_start_date", today)
        .gte("promo_end_date", today),
    ]);
    if (rpcRes.error) return NextResponse.json({ error: rpcRes.error.message }, { status: 500 });

    const allPromos = promoRes.data ?? [];  // keep combo rows — resolvePromoTypes handles them
    const bundleSiteSet = new Set((bundleSitesRes.data ?? []).map((r: any) => (r.site_code as string).toLowerCase()));
    const siteLotTypes = buildLotTypeMap(lotRes.data ?? [], (r) => r.site);
    const siteCategories: Record<string, Set<string>> = {};
    for (const r of lotRes.data ?? []) {
      if (!siteCategories[r.site]) siteCategories[r.site] = new Set();
      if (r.product_category) siteCategories[r.site].add((r.product_category as string).toLowerCase());
    }

    const sites = (rpcRes.data ?? []).map((r: any) => {
      const name = r.site as string;
      const promo_types = resolvePromoTypes(
        siteLotTypes[name] ?? new Set([null]),
        siteCategories[name] ?? new Set(),
        allPromos, name.toLowerCase(), "",
      );
      if (bundleSiteSet.has(name.toLowerCase())) promo_types.push("Bundle Promo");
      return { name, available: Number(r.available), promo_types };
    });

    return NextResponse.json({ sites });
  }

  // ── Step 3: distinct levels for this type + site (optionally filtered by zone) ──
  if (step === "levels") {
    const zone = p.get("zone") ?? "";
    const prefix = p.get("prefix") ?? "";
    let q: any = supabaseAdmin
      .from("product_availability_with_price")
      .select("niche_level")
      .eq("site", site)
      .eq("available", true)
      .not("niche_level", "is", null);
    if (zone) q = q.eq("zone", zone);
    if (prefix) q = q.eq("niche_section", prefix);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const seen = new Set<string>();
    (data ?? []).forEach((r: any) => seen.add(String(r.niche_level)));
    return NextResponse.json({ levels: [...seen] });
  }

  // ── Step 4: zone results grouped by zone ──
  if (step === "zones") {
    const sort = p.get("sort") ?? "available";
    const today = new Date().toISOString().slice(0, 10);
    const [rpcRes, promoRes, lotRes, bundleZonesRes, religionRes] = await Promise.all([
      supabaseAdmin.rpc("get_available_zones_grouped", { p_type: type, p_site: site, p_sort: sort }),
      supabaseAdmin.from("promo_match_rules")
        .select("promo_name, site_code, product_name, lot_type, is_combo")
        .eq("active", true)
        .lte("promo_start_date", today)
        .gte("promo_end_date", today),
      supabaseAdmin.from("product_availability_with_price")
        .select("zone, lot_type, product_category")
        .eq("site", site)
        .eq("available", true)
        .not("price_list_id", "is", null)
        .limit(5000),
      supabaseAdmin.from("bundle_promo_options")
        .select("product_name")
        .eq("active", true)
        .eq("site_code", site)
        .lte("promo_start_date", today)
        .gte("promo_end_date", today),
      supabaseAdmin.from("product_price_list")
        .select("product_name, religion")
        .eq("active", true)
        .eq("site_code", site)
        .not("religion", "is", null),
    ]);
    if (rpcRes.error) return NextResponse.json({ error: rpcRes.error.message }, { status: 500 });

    const allPromos = promoRes.data ?? [];  // keep combo rows — resolvePromoTypes handles them
    const bundleProducts = (bundleZonesRes.data ?? []).map((r: any) => (r.product_name as string).toLowerCase());
    const sl = site.toLowerCase();
    const zoneLotTypes = buildLotTypeMap(lotRes.data ?? [], (r) => r.zone);
    const zoneCategories: Record<string, Set<string>> = {};
    for (const r of lotRes.data ?? []) {
      if (!zoneCategories[r.zone]) zoneCategories[r.zone] = new Set();
      if (r.product_category) zoneCategories[r.zone].add((r.product_category as string).toLowerCase());
    }
    const religionMap: Record<string, string> = {};
    for (const r of religionRes.data ?? []) {
      const k = (r.product_name as string).toLowerCase();
      if (!religionMap[k]) religionMap[k] = r.religion;
    }

    const results = (rpcRes.data ?? [])
      .map((r: any) => {
        const zone = r.zone as string;
        const zl = zone.toLowerCase();
        const promo_types = resolvePromoTypes(
          zoneLotTypes[zone] ?? new Set([null]),
          zoneCategories[zone] ?? new Set(),
          allPromos, sl, zl,
        );
        if (bundleProducts.some(bp => bp === zl || zl.startsWith(bp + "-") || bp.startsWith(zl + "-"))) {
          promo_types.push("Bundle Promo");
        }
        return {
          product_name:       zone,
          zone,
          section:            (r.section as string) ?? "",
          block:              "",
          available:          Number(r.available),
          min_pre_need_price: r.min_pre_need_price ?? null,
          max_pre_need_price: r.max_pre_need_price ?? null,
          promo_types,
          religion:           religionMap[zl] ?? null,
        };
      })
      .filter((r: any) => r.available > 0);

    const site_promos = [...new Set(results.flatMap((r: any) => r.promo_types as string[]))]
      .sort((a, b) => promoNamePriority(b) - promoNamePriority(a));

    return NextResponse.json({ results, site_promos });
  }

  // ── Step 4b: sections within a niche zone ──
  if (step === "sections") {
    const zone = p.get("zone") ?? "";
    if (!zone) return NextResponse.json({ error: "zone required" }, { status: 400 });
    const [rpcRes, promos, lvlRes] = await Promise.all([
      supabaseAdmin.rpc("get_available_sections", { p_type: type, p_site: site, p_zone: zone, p_level: level }),
      fetchZonePromos(site, zone),
      supabaseAdmin
        .from("product_availability_with_price")
        .select("niche_section, niche_level")
        .eq("site", site)
        .eq("zone", zone)
        .eq("available", true)
        .not("niche_section", "is", null)
        .not("niche_level", "is", null),
    ]);
    if (rpcRes.error) return NextResponse.json({ error: rpcRes.error.message }, { status: 500 });
    // Build section → { level: count } map
    const sectionLevelCounts: Record<string, Record<string, number>> = {};
    (lvlRes.data ?? []).forEach((r: any) => {
      const sec = r.niche_section as string;
      const lvl = String(r.niche_level);
      if (!sectionLevelCounts[sec]) sectionLevelCounts[sec] = {};
      sectionLevelCounts[sec][lvl] = (sectionLevelCounts[sec][lvl] ?? 0) + 1;
    });
    const sections = (rpcRes.data ?? []).map((r: any) => {
      const sec = r.section as string;
      const candidates = promos.filter((p: any) => {
        if (p.lot_range && !sectionInRange(sec, p.lot_range)) return false;
        return true;
      });
      return {
        section:            sec,
        available:          Number(r.available),
        min_pre_need_price: r.min_pre_need_price ?? null,
        max_pre_need_price: r.max_pre_need_price ?? null,
        promo:              buildPromoHighlight(candidates),
        level_counts:       sectionLevelCounts[sec] ?? {},
      };
    });
    return NextResponse.json({ sections });
  }

  // ── Step 5: lot types within a specific zone ──
  if (step === "lot_types") {
    const zone = p.get("zone") ?? "";
    if (!zone) return NextResponse.json({ error: "zone required" }, { status: 400 });

    const [rpcRes, promos, sampleRes] = await Promise.all([
      supabaseAdmin.rpc("get_available_lot_types", { p_type: type, p_site: site, p_zone: zone, p_level: level }),
      fetchZonePromos(site, zone),
      supabaseAdmin.from("product_availability_with_price")
        .select("lot_section, lot_type")
        .eq("site", site)
        .eq("zone", zone)
        .eq("available", true)
        .not("lot_section", "is", null)
        .not("lot_type", "is", null)
        .limit(200),
    ]);
    if (rpcRes.error) return NextResponse.json({ error: rpcRes.error.message }, { status: 500 });

    // Build a lot_section → lot_type map from the view so site-specific overrides
    // (e.g. Klang Zone N where SD = Single, not Super Double) are respected.
    const lotTypeBySection: Record<string, string> = {};
    for (const r of sampleRes.data ?? []) {
      if (r.lot_section && r.lot_type && !lotTypeBySection[r.lot_section]) {
        lotTypeBySection[r.lot_section] = (r.lot_type as string).toLowerCase();
      }
    }

    if ((rpcRes.data ?? []).length > 0) {
      const lot_types = (rpcRes.data ?? []).map((r: any) => {
        const prefix = r.prefix as string;
        const derivedLotType = lotTypeBySection[prefix] ?? deriveLotTypeFromPrefix(prefix);
        const candidates = promos.filter((p: any) => {
          if (p.lot_type) {
            const pLotTypes = p.lot_type.split(/[&,]/).map((s: string) => s.trim().toLowerCase());
            if (derivedLotType && !pLotTypes.includes(derivedLotType)) return false;
          }
          return true;
        });
        return {
          prefix,
          label:     PREFIX_LABELS[prefix] ?? prefix,
          available: Number(r.available),
          min_pre_need_price: r.min_pre_need_price ?? null,
          max_pre_need_price: r.max_pre_need_price ?? null,
          promo:     buildPromoHighlight(candidates),
        };
      });
      return NextResponse.json({ lot_types });
    }

    // Fallback for products organized by `section` column (e.g. EBL), where
    // lot_section is null so the RPC returns nothing. Group by section directly.
    const { data: secData } = await supabaseAdmin
      .from("product_availability")
      .select("section")
      .eq("site", site)
      .eq("zone", zone)
      .eq("available", true)
      .not("section", "is", null);

    if (secData?.length) {
      const countMap: Record<string, number> = {};
      for (const r of secData) { const s = r.section as string; countMap[s] = (countMap[s] ?? 0) + 1; }
      const lot_types = Object.entries(countMap).sort(([a], [b]) => a.localeCompare(b)).map(([sec, count]) => ({
        prefix: sec, label: sec, available: count, min_pre_need_price: null, max_pre_need_price: null,
      }));
      return NextResponse.json({ lot_types });
    }

    return NextResponse.json({ lot_types: [] });
  }

  // ── Step 3.5: distinct promo types for a selected site + zone ──
  if (step === "promo_types") {
    const zone = p.get("zone") ?? "";
    if (!zone) return NextResponse.json({ error: "zone required" }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from("product_promo_options")
      .select("promo_name")
      .eq("site", site)
      .eq("zone", zone);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const names = [...new Set((data ?? []).map((r: any) => r.promo_name as string))]
      .sort((a, b) => promoNamePriority(b) - promoNamePriority(a));
    return NextResponse.json({ promo_types: names });
  }

  return NextResponse.json({ error: "Unknown step" }, { status: 400 });
}
