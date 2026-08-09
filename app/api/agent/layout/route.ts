import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function deriveLotType(section: string): string | null {
  if (/^TD/i.test(section)) return "Double";
  if (/^D/i.test(section))  return "Double";
  if (/^S/i.test(section))  return "Single";
  return null;
}

function deriveBurialLotType(rowKey: string): string {
  const u = rowKey.toUpperCase();
  if (u.startsWith("SF")) return "Super Family";
  if (u.startsWith("SD")) return "Super Double";
  if (u.startsWith("R"))  return "Royal";
  if (u.startsWith("D"))  return "Double";
  if (u.startsWith("S"))  return "Single";
  return "Burial Plot";
}

function sortLevels<T extends { level: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const an = parseFloat(a.level), bn = parseFloat(b.level);
    if (an !== bn) return an - bn;
    return a.level.localeCompare(b.level);
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p       = request.nextUrl.searchParams;
  const site    = p.get("site")    ?? "";
  const product = p.get("product") ?? "";

  if (!site || !product)
    return NextResponse.json({ error: "Missing site or product" }, { status: 400 });

  // Fetch all lots for this site + product from the price-matched view.
  // Some pedestal/EBL zones are stored in zone_layouts as "BASE-A", "BASE-B" etc.
  // but product_availability_with_price uses just "BASE" as the zone.
  // Try the exact product name first; if 0 rows, retry with the base zone (strips single-letter suffix).
  // Use RPC to bypass PostgREST max-rows cap (default 1000) for large zones.
  let { data: rpcData, error } = await supabaseAdmin
    .rpc("get_zone_lot_details", { p_site: site, p_zone: product });

  if (error) {
    console.error('[layout] query error:', error.message, error.details, error.hint);
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
  }

  let data: any[] = rpcData ?? [];

  // Retry with base zone when variant zone (e.g. "BK-A-MH-AT-A") returns no rows
  if (!data.length) {
    const lastDash = product.lastIndexOf('-');
    const suffix   = lastDash > 0 ? product.slice(lastDash + 1) : '';
    const baseZone = (suffix.length <= 2 && /^[A-Za-z]+$/.test(suffix)) ? product.slice(0, lastDash) : '';
    if (baseZone) {
      const { data: retryData, error: retryError } = await supabaseAdmin
        .rpc("get_zone_lot_details", { p_site: site, p_zone: baseZone });
      if (!retryError && retryData?.length) data = retryData;
    }
  }

  // Split into columbarium (niche), burial plot, and pedestal/misc rows
  const nicheData   = (data ?? []).filter(r => r.niche_section != null);
  // Include pedestal/misc rows (lot_section == null) alongside burial rows so lotMeta is populated
  const burialData  = (data ?? []).filter(r => r.niche_section == null && (r.lot_section != null || r.price_section_group != null));

  // Group by niche_section (columbarium)
  const sectionMap: Record<string, typeof nicheData> = {};
  nicheData.forEach(row => {
    const sec = row.niche_section as string;
    if (!sectionMap[sec]) sectionMap[sec] = [];
    sectionMap[sec]!.push(row);
  });

  const sections = Object.entries(sectionMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([section, rows]) => {
      // Group by niche_level
      const levelMap: Record<string, typeof rows> = {};
      (rows ?? []).forEach(r => {
        const lvl = (r.niche_level as string) ?? "?";
        if (!levelMap[lvl]) levelMap[lvl] = [];
        levelMap[lvl]!.push(r);
      });

      const levels = sortLevels(
        Object.entries(levelMap).map(([level, niches]) => ({
          level,
          niches: (niches ?? [])
            .map(n => ({
              lot_code:            n.lot_code as string,
              niche_num:           parseInt((n.lot_code as string).split("-")[2] ?? "0", 10),
              available:           n.available as boolean,
              price_list_id:       n.price_list_id as string | null,
              price_section_group: n.price_section_group as string | null,
              price_level:         n.price_level as string | null,
              price_block:         n.price_block as string | null,
            }))
            .sort((a, b) => a.niche_num - b.niche_num),
        }))
      );

      const total     = (rows ?? []).length;
      const available = (rows ?? []).filter(r => r.available).length;
      const firstRow  = (rows ?? []).find(r => r.price_section_group);

      return {
        section,
        lot_type:      deriveLotType(section),
        section_group: firstRow?.price_section_group ?? section,
        block:         firstRow?.price_block ?? "",
        levels,
        total,
        available,
      };
    });

  // Group burial plots by price list section group (extracted from price_lot_no)
  // e.g. "DB~DJ (8~228)" → "DB~DJ", "DA (8~218)" → "DA"
  function extractBurialGroup(priceLotNo: string | null, lotSection: string | null, priceSectionGroup: string | null): string {
    if (priceLotNo) {
      const m = priceLotNo.match(/^([A-Za-z~]+)/);
      if (m) return m[1].toUpperCase();
    }
    if (lotSection) return lotSection.toUpperCase();
    // Pedestal/misc: group by price_section_group (e.g. "1,2,3,3A,5,6,6A")
    return priceSectionGroup ?? "";
  }

  const burialRowMap: Record<string, typeof burialData> = {};
  burialData.forEach(row => {
    const rowKey = extractBurialGroup(row.price_lot_no as string | null, row.lot_section as string | null, row.price_section_group as string | null);
    if (!rowKey) return;
    if (!burialRowMap[rowKey]) burialRowMap[rowKey] = [];
    burialRowMap[rowKey]!.push(row);
  });

  const burialSections = Object.entries(burialRowMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rowKey, rows]) => {
      const total     = rows.length;
      const available = rows.filter(r => r.available).length;
      const firstRow  = rows.find(r => r.price_section_group);
      return {
        section:       rowKey,
        lot_type:      (firstRow?.lot_type as string) || deriveBurialLotType(rowKey),
        section_group: rowKey,
        block:         (firstRow?.price_block as string) || product,
        is_burial:     true,
        lots: rows.map(r => ({
          lot_code:     r.lot_code as string,
          lot_num:      r.lot_num as number,
          available:    r.available as boolean,
          price_lot_no: r.price_lot_no as string | null,
          price_section_group: r.price_section_group as string | null,
          price_block:  r.price_block as string | null,
        })).sort((a, b) => a.lot_num - b.lot_num),
        levels: [],
        total,
        available,
      };
    });

  // Always fetch price summary from price list (works even without availability sync)
  // Shows section groups with their min pre_need_price and available counts
  const { data: priceRows } = await supabaseAdmin
    .from("product_price_list")
    .select("section_group, lot_type, pre_need_price, as_need_price, level")
    .eq("site_code", site)
    .eq("product_name", product);

  // Build section price summary: min pre_need_price per section_group
  const priceSummaryMap: Record<string, { lot_type: string; min_price: number; level_count: number }> = {};
  for (const row of priceRows ?? []) {
    const sg    = (row.section_group as string) ?? "";
    const price = (row.pre_need_price ?? row.as_need_price ?? 0) as number;
    if (!sg) continue;
    if (!priceSummaryMap[sg]) {
      priceSummaryMap[sg] = { lot_type: (row.lot_type as string) ?? "", min_price: price, level_count: 0 };
    } else if (price > 0 && price < priceSummaryMap[sg].min_price) {
      priceSummaryMap[sg].min_price = price;
    }
    priceSummaryMap[sg].level_count++;
  }

  // Merge availability counts (from sections built above) into the price summary
  const availBySection: Record<string, number> = {};
  sections.forEach(s => { availBySection[s.section_group] = s.available; });

  const priceSummary = Object.entries(priceSummaryMap).map(([section_group, v]) => ({
    section_group,
    lot_type:         v.lot_type,
    min_pre_need_price: v.min_price,
    available:        availBySection[section_group] ?? null,  // null = no sync data
  })).filter(s => s.min_pre_need_price > 0);

  return NextResponse.json({ site, product, sections, burialSections, priceSummary });
}
