import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p       = request.nextUrl.searchParams;
  const site    = p.get("site")    ?? "";
  const product = p.get("product") ?? "";

  if (!site || !product)
    return NextResponse.json({ error: "Missing site or product" }, { status: 400 });

  // Semenyih was split into Semenyih-NMG / Semenyih-NMP for pricing,
  // but zone_layouts may be stored under 'Semenyih' (pre-split) OR under the
  // specific sub-site (post-split). Search all three and deduplicate by zone,
  // preferring the most recently synced entry.
  const semenyihVariants = ["Semenyih", "Semenyih-NMG", "Semenyih-NMP"];
  const isSemenyih = semenyihVariants.includes(site);
  const sitesToSearch = isSemenyih ? semenyihVariants : [site];

  // Return exact zone match AND all sub-section rows (prefix match) together.
  // This handles zones like MP3-GF that have both a parent row (zone="MP3-GF") and
  // per-section sub-rows (zone="MP3-GF-D/S1,…", zone="MP3-GF-CD1,…", etc.).
  // Filtered at the DB level (was: fetch every zone_layouts row for the whole
  // site -- full layout_html blobs included -- then filter in JS) since only
  // one zone's rows are ever used here.
  const prefix = product.toUpperCase() + "-";
  const { data: layoutRows } = await supabaseAdmin
    .from("zone_layouts")
    .select("zone, layout_html, synced_at, site_code")
    .in("site_code", sitesToSearch)
    .or(`zone.eq.${product},zone.ilike.${prefix}%`)
    .order("synced_at", { ascending: false });

  const sortedRows = (layoutRows ?? [])
    .filter((r: any) => r.zone === product || (r.zone as string).toUpperCase().startsWith(prefix))
    .sort((a: any, b: any) => (a.zone as string).localeCompare(b.zone));
  // Deduplicate by zone name — keep most recently synced (already sorted by synced_at above)
  const seenZones = new Set<string>();
  let layouts = sortedRows.filter((r: any) => {
    if (seenZones.has(r.zone)) return false;
    seenZones.add(r.zone);
    return true;
  });

  if (layouts.length === 0)
    return NextResponse.json({ layouts: [] });

  // Determine which zone codes to fetch availability for.
  // For section-variant products (e.g. product="EBL-A"), also include the base zone ("EBL")
  // because product_availability stores lots under the base zone name.
  const layoutZoneCodes = layouts.map(l => l.zone as string);
  const lastDash    = product.lastIndexOf("-");
  const baseZone    = lastDash > 0 ? product.slice(0, lastDash) : null;
  const zonesToFetch = [...new Set([product, ...(baseZone ? [baseZone] : []), ...layoutZoneCodes])];

  // RPC returns a single JSON object {lot_code: available, ...} — bypasses
  // PostgREST's 1000-row cap that would cut off S-section lots for large zones.
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: availRaw }, { data: promoRaw }, { data: bundleRaw }] = await Promise.all([
    supabaseAdmin.rpc("get_zone_lot_availability", { p_site: site, p_zone: product }),
    supabaseAdmin
      .from("product_promo_options")
      .select("lot_code, promo_name")
      .eq("site", site)
      .in("zone", zonesToFetch),
    supabaseAdmin
      .from("bundle_promo_options")
      .select("product_name")
      .eq("site_code", site)
      .eq("active", true)
      .lte("promo_start_date", today)
      .gte("promo_end_date", today),
  ]);

  const availMap: Record<string, boolean> = (availRaw as Record<string, boolean>) ?? {};

  // Build set of product_name prefixes that have an active bundle promo
  const bundleProducts = new Set((bundleRaw ?? []).map((r: any) => (r.product_name as string).toLowerCase()));
  const productLower = product.toLowerCase();
  const hasBundlePromo = [...bundleProducts].some(bp =>
    bp === productLower || productLower.startsWith(bp + "-") || bp.startsWith(productLower + "-")
  );

  const promoPriority = (name: string) => {
    if (name.includes('Customer'))  return 5;
    if (name.includes('New Launch')) return 4;
    if (name.includes('DRPlus') || name.includes('DR+')) return 3;
    if (name.includes('Central'))   return 2;
    return 1;
  };
  const promoMap: Record<string, string> = {};
  (promoRaw ?? []).forEach((r: any) => {
    const existing = promoMap[r.lot_code];
    if (!existing || promoPriority(r.promo_name) > promoPriority(existing)) {
      promoMap[r.lot_code] = r.promo_name;
    }
  });

  // Tag all available lots with Bundle Promo if this zone has an active bundle promo
  if (hasBundlePromo) {
    Object.keys(availMap).forEach(lotCode => {
      if (availMap[lotCode]) {
        if (!promoMap[lotCode]) promoMap[lotCode] = 'Bundle Promo';
      }
    });
  }

  return NextResponse.json({
    layouts: (layouts ?? []).map(l => ({
      zone:       l.zone,
      html:       l.layout_html,
      synced_at:  l.synced_at,
    })),
    // Send current availability so the agent app can re-colour cells live
    availability: availMap,
    // Lots with at least one active promo — used to highlight cells in the layout
    promo_lots: promoMap,
  });
}
