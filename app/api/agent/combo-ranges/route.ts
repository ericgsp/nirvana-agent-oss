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
    return NextResponse.json({ ranges: [] });

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("promo_match_rules")
    .select("product_name, lot_range, combo_total_price, combo_product_name, combo_product_price, combo_product_original_price, combo_excavation_price, lot_type, level_restriction, min_down_payment_pct, max_instalment_months, instalment_tiers, memo_reference, promo_name, promo_end_date, dr_plus_eligible, dr_plus_type, dr_plus_fixed_units, remarks")
    .eq("active", true)
    .eq("is_combo", true)
    .eq("site_code", site)
    .lte("promo_start_date", today)
    .gte("promo_end_date", today);

  if (error) return NextResponse.json({ ranges: [] });

  // Filter to rows matching this product (product_name may be a prefix)
  const productLower = product.toLowerCase();
  const rows = (data ?? []).filter((r: any) => {
    const pName = (r.product_name ?? "").toLowerCase();
    return pName === productLower
      || productLower.startsWith(pName)
      || pName.startsWith(productLower + "-");
  });

  return NextResponse.json({ ranges: rows });
}
