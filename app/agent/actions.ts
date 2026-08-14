"use server";

import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

// ── Promo matching ────────────────────────────────────────────────────────────

type PromoRow = {
  id: string;
  memo_reference: string;
  promo_name: string | null;
  site_code: string;
  product_name: string;
  lot_type: string | null;
  lot_range: string | null;
  level_restriction: string | null;
  min_down_payment_pct: number | null;
  max_instalment_months: number | null;
  discount_pct: number | null;
  discount_rm: number | null;
  dr_plus_eligible: boolean;
  dr_plus_type: string | null;
  dr_plus_fixed_units: number | null;
  is_combo: boolean;
  combo_total_price: number | null;
  promo_start_date: string;
  promo_end_date: string;
  instalment_tiers: { max_price: number | null; months: number }[] | null;
};

function promoNamePriority(name: string | null): number {
  if (name === "Customer Promo") return 3;
  if (name === "DRPlus Promo")   return 2;
  if (name === "Central Promo")  return 1;
  return 0;
}

function deriveLotType(section: string | null): string | null {
  if (!section) return null;
  const s = section.toUpperCase();
  if (s.startsWith("SF")) return "Super Family";
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
  const rowSite    = (row.site  ?? "").toLowerCase();
  const rowZone    = (row.zone  ?? "").toLowerCase();
  const rowSection = row.lot_section ?? row.niche_section ?? null;
  const rowLotNum  = row.lot_num ?? null;
  const rowLevel   = String(row.niche_level ?? "");

  const rawLotType = row.lot_type ?? deriveLotType(row.lot_section);
  const rowLotType = (rawLotType ?? "").toLowerCase();

  const hasCombo = promos.some(p =>
    p.is_combo &&
    (p.site_code ?? "").toLowerCase() === rowSite &&
    (p.product_name ?? "").toLowerCase() === rowZone &&
    lotRangeMatch(rowSection, rowLotNum, p.lot_range)
  );

  const candidates = promos.filter(p => {
    if ((p.site_code ?? "").toLowerCase() !== rowSite) return false;
    if (hasCombo && !p.is_combo) return false;
    if (!hasCombo && p.is_combo) return false;

    const pName = (p.product_name ?? "").toLowerCase();
    if (!pName) return false;
    if (pName !== "central region") {
      if (pName !== rowZone && !rowZone.startsWith(pName) && !pName.startsWith(rowZone + "-")) return false;
    } else {
      if (rowZone === "ebl") return false;
    }

    if (p.lot_type && !p.is_combo) {
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

// ── Exported actions ──────────────────────────────────────────────────────────

export async function fetchProducts(site: string) {
  const { data, error } = await supabaseAdmin
    .from("product_availability_with_price")
    .select("zone, product_category")
    .eq("site", site)
    .eq("available", true)
    .not("price_list_id", "is", null)
    .limit(10000);
  console.log("[fetchProducts] site=", site, "rows=", data?.length, "error=", error?.message);
  console.log("[fetchProducts] sample zones=", data?.slice(0, 5).map(r => r.zone));
  const countMap: Record<string, number> = {};
  const catMap: Record<string, string> = {};
  (data ?? []).forEach(r => {
    if (!r.zone) return;
    countMap[r.zone] = (countMap[r.zone] ?? 0) + 1;
    catMap[r.zone] = r.product_category ?? "";
  });
  console.log("[fetchProducts] distinct zones=", Object.keys(countMap).length, Object.keys(countMap));
  return Object.entries(countMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, available]) => ({ name, category: catMap[name], available }));
}

export async function fetchZoneLayout(site: string, product: string) {
  const { data: directLayouts } = await supabaseAdmin
    .from("zone_layouts").select("zone, layout_html, synced_at")
    .eq("site_code", site).eq("zone", product);

  let layouts = directLayouts ?? [];

  if (layouts.length === 0) return { layouts: [], availability: {} };

  const layoutZoneCodes = layouts.map(l => l.zone as string);
  const zonesToFetch = [...new Set([product, ...layoutZoneCodes])];
  const { data: availability } = await supabaseAdmin
    .from("product_availability").select("lot_code, available, zone")
    .eq("site", site).in("zone", zonesToFetch);

  const availMap: Record<string, boolean> = {};
  (availability ?? []).forEach(r => { availMap[r.lot_code as string] = r.available as boolean; });

  return {
    layouts: layouts.map(l => ({ zone: l.zone, html: l.layout_html, synced_at: l.synced_at })),
    availability: availMap,
  };
}

export async function fetchLayout(site: string, product: string) {
  const { data, error } = await supabaseAdmin
    .from("product_availability_with_price")
    .select("lot_code, niche_section, niche_level, available, price_list_id, price_section_group, price_level, price_block")
    .eq("site", site).eq("product_name", product)
    .not("niche_section", "is", null);

  if (error) return { error: error.message };

  const sectionMap: Record<string, typeof data> = {};
  (data ?? []).forEach(row => {
    const sec = row.niche_section as string;
    if (!sectionMap[sec]) sectionMap[sec] = [];
    sectionMap[sec]!.push(row);
  });

  function deriveNicheLotType(section: string) {
    if (/^TD/i.test(section)) return "Double";
    if (/^D/i.test(section)) return "Double";
    if (/^S/i.test(section)) return "Single";
    return null;
  }
  function sortLevels<T extends { level: string }>(rows: T[]) {
    return [...rows].sort((a, b) => {
      const an = parseFloat(a.level), bn = parseFloat(b.level);
      if (an !== bn) return an - bn;
      return a.level.localeCompare(b.level);
    });
  }

  const sections = Object.entries(sectionMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([section, rows]) => {
      const levelMap: Record<string, typeof rows> = {};
      (rows ?? []).forEach(r => {
        const lvl = (r.niche_level as string) ?? "?";
        if (!levelMap[lvl]) levelMap[lvl] = [];
        levelMap[lvl]!.push(r);
      });
      const levels = sortLevels(
        Object.entries(levelMap).map(([level, niches]) => ({
          level,
          niches: (niches ?? []).map(n => ({
            lot_code: n.lot_code as string,
            niche_num: parseInt((n.lot_code as string).split("-")[2] ?? "0", 10),
            available: n.available as boolean,
            price_list_id: n.price_list_id as string | null,
            price_section_group: n.price_section_group as string | null,
            price_level: n.price_level as string | null,
            price_block: n.price_block as string | null,
          })).sort((a, b) => a.niche_num - b.niche_num),
        }))
      );
      const firstRow = (rows ?? []).find(r => r.price_section_group);
      return {
        section, lot_type: deriveNicheLotType(section),
        section_group: firstRow?.price_section_group ?? section,
        block: firstRow?.price_block ?? "",
        levels, total: (rows ?? []).length,
        available: (rows ?? []).filter(r => r.available).length,
      };
    });

  const { data: priceRows } = await supabaseAdmin
    .from("product_price_list").select("section_group, lot_type, pre_need_price, as_need_price, level")
    .eq("site_code", site).eq("product_name", product);

  const priceSummaryMap: Record<string, { lot_type: string; min_price: number; level_count: number }> = {};
  for (const row of priceRows ?? []) {
    const sg = (row.section_group as string) ?? "";
    const price = (row.pre_need_price ?? row.as_need_price ?? 0) as number;
    if (!sg) continue;
    if (!priceSummaryMap[sg]) priceSummaryMap[sg] = { lot_type: (row.lot_type as string) ?? "", min_price: price, level_count: 0 };
    else if (price > 0 && price < priceSummaryMap[sg].min_price) priceSummaryMap[sg].min_price = price;
    priceSummaryMap[sg].level_count++;
  }

  const availBySection: Record<string, number> = {};
  sections.forEach(s => { availBySection[s.section_group] = s.available; });

  const priceSummary = Object.entries(priceSummaryMap).map(([section_group, v]) => ({
    section_group, lot_type: v.lot_type, min_pre_need_price: v.min_price,
    available: availBySection[section_group] ?? null,
  })).filter(s => s.min_pre_need_price > 0);

  return { site, product, sections, priceSummary };
}

export async function fetchQuotation(site: string, product: string, block: string, section: string, levels: string[]) {
  let q = supabaseAdmin.from("product_price_list").select("*")
    .eq("site_code", site).eq("product_name", product)
    .eq("block", block).eq("section_group", section);
  if (levels.length) q = q.in("level", levels);
  let { data: priceRows } = await q;

  if (!priceRows?.length) {
    let q2 = supabaseAdmin.from("product_price_list").select("*")
      .eq("site_code", site).eq("product_name", product).eq("block", block)
      .or(`section_group.like.${section}/%,section_group.like.%/${section}`);
    if (levels.length) q2 = q2.in("level", levels);
    const { data: fallback } = await q2;
    priceRows = fallback ?? [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: siteInfo }, { data: promoData }, { data: availData }] = await Promise.all([
    supabaseAdmin.from("sites").select("*").eq("site_code", site).maybeSingle(),
    supabaseAdmin.from("promo_match_rules").select("*")
      .eq("active", true)
      .lte("promo_start_date", today)
      .gte("promo_end_date", today),
    supabaseAdmin.from("product_availability_with_price").select("price_level")
      .eq("site", site).eq("product_name", product)
      .eq("price_block", block).eq("price_section_group", section)
      .eq("available", true).not("price_list_id", "is", null),
  ]);

  const promoList: PromoRow[] = promoData ?? [];

  const countByLevel: Record<string, number> = {};
  (availData ?? []).forEach(r => {
    if (r.price_level) countByLevel[r.price_level] = (countByLevel[r.price_level] ?? 0) + 1;
  });

  function deriveColumbariumLotType(sectionGroup: string) {
    const first = sectionGroup.split("/")[0];
    if (/^TD/i.test(first)) return "Double";
    if (/^D/i.test(first)) return "Double";
    if (/^S/i.test(first)) return "Single";
    return null;
  }

  function resolveInstalmentMonths(promo: PromoRow, grossPrice: number) {
    if (promo.instalment_tiers?.length) {
      for (const tier of promo.instalment_tiers) {
        if (tier.max_price == null || grossPrice <= tier.max_price) return tier.months;
      }
    }
    return promo.max_instalment_months ?? null;
  }

  const derivedLotType = deriveColumbariumLotType(section);
  const firstRow = priceRows?.[0];
  const sectionForMatch = section.split("/")[0];

  const sorted = [...(priceRows ?? [])].sort((a: any, b: any) => {
    const an = parseFloat(a.level), bn = parseFloat(b.level);
    if (an !== bn) return an - bn;
    return String(a.level).localeCompare(String(b.level));
  });

  const levelRows = sorted.map((row: any) => {
    const lotType  = row.lot_type ?? derivedLotType;
    const grossPrice = row.pre_need_price ?? row.as_need_price ?? 0;

    const promoMatch = matchPromo({
      site,
      zone:          product,
      lot_section:   sectionForMatch,
      niche_section: sectionForMatch,
      lot_num:       null,
      niche_level:   row.level,
      lot_type:      lotType,
    }, promoList);

    const resolvedPromo = promoMatch ? {
      ...promoMatch,
      max_instalment_months: resolveInstalmentMonths(promoMatch, grossPrice),
    } : null;

    return { ...row, lot_type: lotType, promo: resolvedPromo, available_count: countByLevel[row.level] ?? 0 };
  });

  return {
    site, site_name_en: siteInfo?.site_name_en ?? site,
    site_name_zh: siteInfo?.site_name_zh ?? "",
    product, product_category: firstRow?.product_category ?? "",
    block, section, lot_type: firstRow?.lot_type ?? derivedLotType ?? "",
    levels: levelRows,
  };
}

// Every quote gets a lead so Leads tab is the single place quote follow-up
// ever lives -- matches an existing lead by phone (more reliable than name,
// which can have spelling variants), then by exact name, and only creates a
// new one if neither matches. Unnamed quotes still get a placeholder lead
// (rather than being left unmanageable) that the agent can rename later.
async function resolveLeadId(
  userId: string,
  customerName: string | undefined,
  customerPhone: string | undefined,
  site: string,
  product: string
): Promise<string | null> {
  const name = (customerName || "").trim();
  const phone = (customerPhone || "").trim();

  if (phone) {
    const { data } = await supabaseAdmin
      .from("leads").select("id").eq("user_id", userId).eq("phone", phone).limit(1);
    if (data && data.length) return data[0].id;
  }
  if (name) {
    const { data } = await supabaseAdmin
      .from("leads").select("id").eq("user_id", userId).eq("name", name).limit(1);
    if (data && data.length) return data[0].id;
  }

  const leadName = name || `Unnamed — ${site} ${product}`.trim();
  const { data: created } = await supabaseAdmin
    .from("leads")
    .insert({ user_id: userId, name: leadName, phone: phone || null, source: "quote" })
    .select("id")
    .limit(1);
  return created && created.length ? created[0].id : null;
}

// ── Recent quotes (Home tab) ────────────────────────────────────────────────
// Logged once per deliberate "Print/Share" tap, not per lot selection —
// /agent is usable without login, so a missing user just means the quote
// isn't attributed to anyone (still fine to log for aggregate purposes).
export async function logQuoteView(
  site: string, product: string, section: string, netTotal: number,
  customerName?: string, customerPhone?: string, validUntil?: string | null,
  items?: { label: string; amount: number }[], quoteSnapshotHtml?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const leadId = user ? await resolveLeadId(user.id, customerName, customerPhone, site, product) : null;

  await supabaseAdmin.from("recent_quotes").insert({
    user_id: user?.id ?? null,
    site, product, section,
    net_total: netTotal,
    customer_name: customerName || null,
    customer_phone: customerPhone || null,
    valid_until: validUntil || null,
    items: items && items.length ? items : null,
    lead_id: leadId,
    quote_snapshot_html: quoteSnapshotHtml || null,
  });
}

// ── Mark as Sold (Me tab) ────────────────────────────────────────────────────
// Manual v1 sales recording -- an agent marks their own generated quotation
// "Sold" with the final amount. Always attributed to the logged-in caller,
// never an arbitrary user_id from the client.
export async function markSold(
  quotationRef: string, amount: number, soldAt?: string,
  closedItems?: { label: string; amount: number; instalMonths?: number }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not logged in" };

  await supabaseAdmin.from("sales_log").insert({
    user_id: user.id,
    quotation_ref: quotationRef,
    amount,
    sold_at: soldAt ?? new Date().toISOString().slice(0, 10),
    recorded_by: user.id,
  });

  // quotationRef is "site|product|section|id" -- the id is what recent_quotes
  // is actually keyed on, so status updates always target the last segment.
  const quoteId = quotationRef.split("|").pop();
  if (quoteId) {
    const closedAt = new Date();
    // Last instalment date = closed date + the longest instalment period
    // among the items actually closed (a mixed-item quote pays off on
    // whichever item takes longest).
    const maxInstalMonths = (closedItems ?? []).reduce(
      (max, it) => Math.max(max, it.instalMonths || 0), 0
    );
    const lastInstalmentDate = new Date(closedAt);
    lastInstalmentDate.setMonth(lastInstalmentDate.getMonth() + maxInstalMonths);

    await supabaseAdmin
      .from("recent_quotes")
      .update({
        status: "closed",
        closed_items: closedItems && closedItems.length ? closedItems : null,
        closed_at: closedAt.toISOString(),
        last_instalment_date: maxInstalMonths > 0 ? lastInstalmentDate.toISOString().slice(0, 10) : null,
      })
      .eq("id", quoteId)
      .eq("user_id", user.id);
  }

  return { ok: true as const };
}

// ── Quote status (Close / Lost / Follow-up) ───────────────────────────────────
// "Close" goes through markSold() above instead (it needs an amount); this is
// for the other two statuses, which don't.
export async function updateQuoteStatus(quotationRef: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not logged in" };

  const quoteId = quotationRef.split("|").pop();
  if (!quoteId) return { ok: false as const, error: "Invalid quotation reference" };

  const { error } = await supabaseAdmin
    .from("recent_quotes")
    .update({ status })
    .eq("id", quoteId)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ── Edit customer name/phone on an already-logged quote ───────────────────────
export async function updateQuoteCustomer(quotationRef: string, customerName: string, customerPhone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not logged in" };

  const quoteId = quotationRef.split("|").pop();
  if (!quoteId) return { ok: false as const, error: "Invalid quotation reference" };

  const { error } = await supabaseAdmin
    .from("recent_quotes")
    .update({ customer_name: customerName || null, customer_phone: customerPhone || null })
    .eq("id", quoteId)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ── Delete a logged quote from the Me tab list ─────────────────────────────────
// Only removes the recent_quotes row -- any sales_log entry from a prior
// "Close" stays untouched, since that's a real sales record, not a view of it.
export async function deleteQuote(quotationRef: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not logged in" };

  const quoteId = quotationRef.split("|").pop();
  if (!quoteId) return { ok: false as const, error: "Invalid quotation reference" };

  const { error } = await supabaseAdmin
    .from("recent_quotes")
    .delete()
    .eq("id", quoteId)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
