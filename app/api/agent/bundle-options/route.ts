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
    return NextResponse.json({ options: [] });

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("bundle_promo_options")
    .select("*")
    .eq("active", true)
    .eq("site_code", site)
    .lte("promo_start_date", today)
    .gte("promo_end_date", today)
    .order("option_name");

  if (error) return NextResponse.json({ options: [] });

  // Filter by product name prefix match (e.g. "JLD-B-GF" matches promo row with product_name="JLD-B-GF")
  const productLower = product.toLowerCase();
  const rows = (data ?? []).filter((r: any) => {
    const pName = (r.product_name ?? "").toLowerCase();
    return pName === productLower
      || productLower.startsWith(pName + "-")
      || pName.startsWith(productLower + "-");
  });

  // If no site-specific rows found, fall back to Central-Region catch-all
  if (!rows.length) {
    const { data: centralData } = await supabaseAdmin
      .from("bundle_promo_options")
      .select("*")
      .eq("active", true)
      .eq("site_code", "Central-Region")
      .eq("product_name", "ALL")
      .lte("promo_start_date", today)
      .gte("promo_end_date", today)
      .order("option_name");

    if (!centralData?.length) return NextResponse.json({ options: [] });
    rows.push(...centralData);
  }

  if (!rows.length) return NextResponse.json({ options: [] });

  // Enrich each option with live NLP pricing from product_price_list and promo terms from promo_match_rules
  const optionNames = rows.map((r: any) => r.option_name);

  const [{ data: nlpPrices }, { data: nlpPromos }, { data: productReligion }] = await Promise.all([
    supabaseAdmin
      .from("product_price_list")
      .select("section_group, pre_need_price, as_need_price, trust_account_facility")
      .eq("site_code", "Nirvana Life Planning")
      .eq("product_name", "NLP")
      .in("section_group", optionNames)
      .eq("active", true),
    supabaseAdmin
      .from("promo_match_rules")
      .select("lot_range, max_instalment_months, min_down_payment_pct, dr_plus_eligible, dr_plus_type, dr_plus_fixed_units, discount_rm")
      .eq("site_code", "Nirvana Life Planning")
      .eq("product_name", "NLP")
      .eq("active", true)
      .lte("promo_start_date", today)
      .gte("promo_end_date", today)
      .in("lot_range", optionNames),
    supabaseAdmin
      .from("product_price_list")
      .select("religion")
      .eq("site_code", site)
      .not("religion", "is", null)
      .or(`product_name.ilike.${product},lot_no.ilike.${product}-%,block.ilike.${product}%,block.eq.${product.split('-')[0]}`)
      .limit(1),
  ]);

const religion = (productReligion ?? [])[0]?.religion ?? null;

  const enriched = rows.map((r: any) => {
    const price = (nlpPrices ?? []).find((p: any) => p.section_group === r.option_name);
    const promo = (nlpPromos ?? []).find((p: any) => p.lot_range === r.option_name);
    return {
      ...r,
      nlp_as_need_price:         price?.as_need_price          ?? r.option_pre_need_price,
      nlp_pre_need_price:        price?.pre_need_price         ?? r.option_pre_need_price,
      nlp_trust_account:         price?.trust_account_facility ?? r.option_trust_account,
      nlp_max_instalment_months: promo?.max_instalment_months  ?? r.max_instalment_months,
      nlp_min_down_payment_pct:  promo?.min_down_payment_pct   ?? r.min_down_payment_pct,
      product_religion:          religion,
    };
  });

  return NextResponse.json({ options: enriched });
}
