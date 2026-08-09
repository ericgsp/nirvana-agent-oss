import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  remarks: string | null;
};

function promoNamePriority(name: string | null): number {
  if (name === "Customer Promo")   return 3;
  if (name === "New Launch Promo") return 3;
  if (name === "DRPlus Promo")     return 2;
  if (name === "Central Promo")  return 1;
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
  if (sectionPart.includes("~")) {
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

function matchPromo(row: any, promos: PromoRow[]): PromoRow | null {
  if (row.product_category === "Package Plot") return null;
  const rowSite    = (row.site  ?? "").toLowerCase();
  const rowZone    = (row.zone  ?? "").toLowerCase();
  const rowSection = row.lot_section ?? row.niche_section ?? null;
  const rowLotNum  = row.lot_num ?? null;
  const rowLevel   = String(row.niche_level ?? row.price_level ?? "");

  const rawLotType = row.lot_type ?? deriveLotType(row.lot_section);
  const rowLotType = (rawLotType ?? "").toLowerCase();

  const candidates = promos.filter(p => {
    const pName = (p.product_name ?? "").toLowerCase();
    const isCentralPromo = pName === "central region";
    if (!isCentralPromo && (p.site_code ?? "").toLowerCase() !== rowSite) return false;
    if (p.is_combo) return false;

    if (!pName) return false;
    if (!isCentralPromo) {
      if (pName !== rowZone && !rowZone.startsWith(pName) && !pName.startsWith(rowZone + "-")) return false;
    } else {
      if (rowZone === "ebl") return false;
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

    return true;
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const pa = promoNamePriority(a.promo_name);
    const pb = promoNamePriority(b.promo_name);
    if (pb !== pa) return pb - pa;
    const da = a.discount_rm ?? (a.discount_pct ?? 0);
    const db = b.discount_rm ?? (b.discount_pct ?? 0);
    return db - da;
  });

  const best = candidates[0];

  if (best.promo_name === "DRPlus Promo") {
    const central = candidates.find(p => p.promo_name === "Central Promo");
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

function resolveInstalmentMonths(promo: PromoRow, grossPrice: number): number | null {
  if (promo.instalment_tiers?.length) {
    for (const tier of promo.instalment_tiers) {
      if (tier.max_price == null || grossPrice <= tier.max_price) return tier.months;
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
  const pairs   = p.get("pairs")   ?? "";

  if (!site || !product || !pairs)
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });

  const sectionPairs = pairs.split(",").map(s => {
    const [block, section] = s.split("|");
    return { block: block ?? "", section: section ?? "" };
  }).filter(pp => pp.block && pp.section);

  if (!sectionPairs.length)
    return NextResponse.json({ error: "No valid pairs" }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  // Use RPC to bypass PostgREST max-rows cap (default 1000) for large zones.
  const [siteInfoRes, promoRes, availRes] = await Promise.all([
    supabaseAdmin.from("sites").select("*").eq("site_code", site).maybeSingle(),
    supabaseAdmin.from("promo_match_rules").select("*")
      .eq("active", true)
      .lte("promo_start_date", today)
      .gte("promo_end_date", today),
    supabaseAdmin.rpc("get_zone_available_price_lots", { p_site: site, p_zone: product }),
  ]);

  const siteInfo  = siteInfoRes.data;
  const promoList: PromoRow[] = promoRes.data ?? [];
  let allRows: any[]  = availRes.data ?? [];

  // Sub-zone fallback: when zone_layouts uses a composite name (e.g. 'BK-A-LG1-HB-S3A-D6, D7, D8, D9, D10')
  // but lots live under the parent zone in product_availability_with_price, retry with the base zone.
  let effectiveZone = product;
  if (!allRows.length && product.includes(',')) {
    const baseZone = product.replace(/-[^-,]+(?:,.*)?$/, '');
    if (baseZone !== product) {
      const { data: retryRows } = await supabaseAdmin
        .rpc("get_zone_available_price_lots", { p_site: site, p_zone: baseZone });
      if (retryRows?.length) { allRows = retryRows; effectiveZone = baseZone; }
    }
  }

  // Package Plot: fetch hole_excavation_fees + tomb_price from product_price_list directly.
  const ppExtraMap: Record<string, { hole_excavation_fees: number | null; tomb_price: number | null }> = {};
  if (allRows.some((r: any) => ["Package Plot", "Urn Burial"].includes(r.product_category))) {
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

  const sectionResults = sectionPairs.map(({ block, section }) => {

    // Match availability rows to this section
    const sectionRows = allRows.filter((r: any) => {
      if (r.niche_section != null) {
        if (r.price_block !== block && r.price_block !== effectiveZone) return false;
        if (r.price_section_group == null) return true; // no section grouping (e.g. DZW pedestal): all lots in block match
        if (r.price_section_group === section) return true;
        if (!section.includes('/')) return r.niche_section === section;
        if (('/' + r.price_section_group + '/').includes('/' + section + '/')) return true;
        return false;
      } else {
        const sec = section.toUpperCase();
        if (r.price_section_group && (r.price_section_group as string).toUpperCase() === sec) return true;
        if (r.price_lot_no) {
          const m = (r.price_lot_no as string).toUpperCase().match(/^([A-Z~]+)/);
          if (m && m[1] === sec) return true;
        }
        return (r.lot_section ?? "").toUpperCase() === sec;
      }
    });

    if (!sectionRows.length) {
      return {
        site, site_name_en: siteInfo?.site_name_en ?? site,
        site_name_zh: siteInfo?.site_name_zh ?? "",
        product, product_category: "", block, section, lot_type: "", levels: [],
      };
    }

    const isBurial  = sectionRows[0].niche_section == null;
    const firstRow  = sectionRows[0];
    const sectionLotType = firstRow.lot_type ?? (isBurial
      ? deriveLotType(firstRow.lot_section)
      : null);

    // Group by price tier:
    // Niches  → price_level  (e.g. "3", "4", "5")
    // Burial  → price_lot_no (e.g. "SAB-SF(8~388)") — one entry per price bracket
    const groupMap: Record<string, any[]> = {};
    sectionRows.forEach((r: any) => {
      const key = isBurial ? (r.price_lot_no ?? "std") : (r.price_level ?? "std");
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(r);
    });

    const levels: any[] = [];
    if (isBurial) {
      // For burial: one column per general promo (no lot_range restriction) sorted by DP,
      // so all DP-tier options appear side-by-side. Lot-range-restricted promos are handled
      // by virtual sections below and must not appear here.
      const generalPromos = promoList
        .filter(p => !p.is_combo && !p.lot_range)
        .filter(p => matchPromo({
          site, zone: product,
          lot_section: firstRow.lot_section ?? null, niche_section: null,
          lot_num: null, niche_level: null, price_level: null,
          lot_type: sectionLotType,
        }, [p]) !== null)
        .sort((a, b) => (a.min_down_payment_pct ?? 0) - (b.min_down_payment_pct ?? 0));

      for (const [groupKey, rows] of Object.entries(groupMap)) {
        const rep     = rows[0];
        const lotType = rep.lot_type ?? deriveLotType(rep.lot_section);
        const preNeed = rep.pre_need_price ?? 0;

        if (generalPromos.length) {
          for (const gp of generalPromos) {
            levels.push({
              level: null, lot_no: groupKey, lot_type: lotType,
              pre_need_price:         rep.pre_need_price         ?? null,
              as_need_price:          rep.as_need_price          ?? null,
              trust_account_facility: rep.trust_account_facility ?? 0,
              backwall_cost:          rep.backwall_cost          ?? 0,
              hole_excavation_fees:   ppExtraMap[groupKey]?.hole_excavation_fees ?? null,
              tomb_price:             ppExtraMap[groupKey]?.tomb_price           ?? null,
              product_category:       rep.product_category       ?? "",
              size_description:       rep.size_description       ?? null,
              promo: { ...gp, max_instalment_months: resolveInstalmentMonths(gp, preNeed) },
              available_count: rows.length,
            });
          }
        } else {
          // No promos — standard pricing column
          levels.push({
            level: null, lot_no: groupKey, lot_type: lotType,
            pre_need_price:         rep.pre_need_price         ?? null,
            as_need_price:          rep.as_need_price          ?? null,
            trust_account_facility: rep.trust_account_facility ?? 0,
            backwall_cost:          rep.backwall_cost          ?? 0,
            hole_excavation_fees:   ppExtraMap[groupKey]?.hole_excavation_fees ?? null,
            tomb_price:             ppExtraMap[groupKey]?.tomb_price           ?? null,
            product_category:       rep.product_category       ?? "",
            size_description:       rep.size_description       ?? null,
            promo: null,
            available_count: rows.length,
          });
        }
      }
      // Sort: by lot_no bracket first, then by DP within each bracket
      levels.sort((a, b) => {
        const lotCmp = String(a.lot_no).localeCompare(String(b.lot_no));
        if (lotCmp !== 0) return lotCmp;
        return (a.promo?.min_down_payment_pct ?? 0) - (b.promo?.min_down_payment_pct ?? 0);
      });
    } else {
      // Niche: one column per price_level with best-match promo (existing behaviour)
      Object.entries(groupMap).forEach(([groupKey, rows]) => {
        const rep     = rows[0];
        const lotType = rep.lot_type ?? null;
        const preNeed = rep.pre_need_price ?? 0;
        const promoMatch = matchPromo({
          site, zone: product,
          lot_section:   rep.lot_section  ?? null,
          niche_section: rep.niche_section ?? null,
          lot_num:       rep.lot_num       ?? null,
          niche_level:   rep.niche_level   ?? rep.price_level ?? null,
          price_level:   rep.price_level   ?? null,
          lot_type:      lotType,
        }, promoList);
        levels.push({
          level: groupKey, lot_no: null, lot_type: lotType,
          pre_need_price:         rep.pre_need_price         ?? null,
          as_need_price:          rep.as_need_price          ?? null,
          trust_account_facility: rep.trust_account_facility ?? 0,
          backwall_cost:          rep.backwall_cost          ?? 0,
          hole_excavation_fees:   ppExtraMap[groupKey]?.hole_excavation_fees ?? null,
          tomb_price:             ppExtraMap[groupKey]?.tomb_price           ?? null,
          product_category:       rep.product_category       ?? "",
          size_description:       rep.size_description       ?? null,
          promo: promoMatch ? { ...promoMatch, max_instalment_months: resolveInstalmentMonths(promoMatch, preNeed) } : null,
          available_count: rows.length,
        });
      });
      // Sort niches by numeric level
      levels.sort((a, b) => {
        const an = parseFloat(a.level), bn = parseFloat(b.level);
        if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
        return String(a.level).localeCompare(String(b.level));
      });
    }

    return {
      site,
      site_name_en:    siteInfo?.site_name_en ?? site,
      site_name_zh:    siteInfo?.site_name_zh ?? "",
      product,
      product_category: firstRow.product_category ?? "",
      block,
      section,
      lot_type:        sectionLotType ?? "",
      levels,
    };
  });

  // ── Virtual sections for lot-range-restricted promos ─────────────────────────
  // When a promo row targets a sub-range of lots (e.g. FA~FH lots 8–118 @ 35%),
  // generate a separate "virtual" result so the agent sees a dedicated promo card
  // for that range, distinct from the general section card.
  const restrictedPromos = promoList.filter(p => p.lot_range && !p.is_combo);
  if (restrictedPromos.length) {
    const burialRows = allRows.filter((r: any) => r.niche_section == null);
    if (burialRows.length) {
      const commonBlock = sectionPairs[0]?.block || effectiveZone;
      const uniqueRanges = [...new Set(restrictedPromos.map(p => p.lot_range!))] as string[];

      for (const lotRange of uniqueRanges) {
        const rangePromos = restrictedPromos.filter(p => p.lot_range === lotRange);
        const lotTypeRestriction = rangePromos.find(p => p.lot_type)?.lot_type ?? null;

        const matchingRows = burialRows.filter((r: any) => {
          if (lotTypeRestriction) {
            const rowLotType = (r.lot_type ?? deriveLotType(r.lot_section) ?? "").toLowerCase();
            const pLotTypes = promoLotTypes(lotTypeRestriction);
            if (pLotTypes.length && rowLotType && !pLotTypes.includes(rowLotType)) return false;
          }
          return lotRangeMatch(r.lot_section, r.lot_num, lotRange);
        });

        if (!matchingRows.length) continue;

        const vGroupMap: Record<string, any[]> = {};
        matchingRows.forEach((r: any) => {
          const key = r.price_lot_no ?? "std";
          if (!vGroupMap[key]) vGroupMap[key] = [];
          vGroupMap[key].push(r);
        });

        // Merge price brackets with identical pre_need_price into one combined group
        // (e.g. FH lots sharing the same price as FA~FG lots avoid a redundant column)
        const mergedByPrice: Record<number, { rows: any[]; lotNums: number[] }> = {};
        for (const rows of Object.values(vGroupMap)) {
          const priceKey = rows[0].pre_need_price ?? 0;
          if (!mergedByPrice[priceKey]) mergedByPrice[priceKey] = { rows: [], lotNums: [] };
          mergedByPrice[priceKey].rows.push(...rows);
          for (const r of rows) {
            const n = r.lot_num ?? 0;
            if (n > 0) mergedByPrice[priceKey].lotNums.push(n);
          }
        }

        // Sort range promos by min_down_payment_pct so columns appear in DP-tier order
        const sortedRangePromos = [...rangePromos].sort(
          (a, b) => (a.min_down_payment_pct ?? 0) - (b.min_down_payment_pct ?? 0)
        );

        const vLevels: any[] = [];
        for (const { rows, lotNums } of Object.values(mergedByPrice)) {
          const rep     = rows[0];
          const lotType = rep.lot_type ?? deriveLotType(rep.lot_section);
          const preNeed = rep.pre_need_price ?? 0;

          const minN = lotNums.length ? Math.min(...lotNums) : 0;
          const maxN = lotNums.length ? Math.max(...lotNums) : 0;
          const displayLotNo = lotNums.length
            ? (minN === maxN ? `Lot ${minN}` : `Lots ${minN}–${maxN}`)
            : "std";

          // One column per DP tier / promo row so agent sees all options
          for (const rangePromo of sortedRangePromos) {
            vLevels.push({
              level: null,
              lot_no: displayLotNo,
              lot_type: lotType,
              pre_need_price:         rep.pre_need_price         ?? null,
              as_need_price:          rep.as_need_price          ?? null,
              trust_account_facility: rep.trust_account_facility ?? 0,
              backwall_cost:          rep.backwall_cost          ?? 0,
              hole_excavation_fees:   null,
              tomb_price:             null,
              product_category:       rep.product_category       ?? "",
              size_description:       rep.size_description       ?? null,
              promo: {
                ...rangePromo,
                max_instalment_months: resolveInstalmentMonths(rangePromo, preNeed),
              },
              available_count: rows.length,
            });
          }
        }

        if (!vLevels.length) continue;

        const firstRow = matchingRows[0];
        (sectionResults as any[]).push({
          site,
          site_name_en:    siteInfo?.site_name_en ?? site,
          site_name_zh:    siteInfo?.site_name_zh ?? "",
          product,
          product_category: firstRow.product_category ?? "",
          block:   commonBlock,
          section: lotRange,
          lot_type: firstRow.lot_type ?? deriveLotType(firstRow.lot_section) ?? "",
          levels:  vLevels,
          virtual: true,
        });
      }
    }
  }

  return NextResponse.json({ results: sectionResults });
}
