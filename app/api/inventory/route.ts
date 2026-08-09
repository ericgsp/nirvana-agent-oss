import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });

    const params   = new URL(request.url).searchParams;
    const site     = params.get("site") ?? "";
    const zone     = params.get("zone") ?? "";
    const category = params.get("category") ?? "";
    const promo    = params.get("promo") ?? "";
    const page     = Math.max(1, parseInt(params.get("page") ?? "1"));
    const pageSize = 100;

    let query = supabaseAdmin
      .from("product_promo_options")
      .select("*", { count: "exact" })
      .order("site")
      .order("zone")
      .order("lot_code")
      .order("promo_name")
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (site)     query = query.eq("site", site);
    if (zone)     query = query.eq("zone", zone);
    if (category) query = query.eq("product_category", category);
    if (promo)    query = query.eq("promo_name", promo);

    const { data, count, error } = await query;
    if (error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });

    const { data: filterOptions } = await supabaseAdmin.rpc("get_inventory_filter_options");

    // Distinct promo names for the promo filter dropdown
    const { data: promoNames } = await supabaseAdmin
      .from("product_promo_options")
      .select("promo_name")
      .order("promo_name");
    const distinctPromos = [...new Set((promoNames ?? []).map((r: any) => r.promo_name as string))];

    return new Response(JSON.stringify({
      rows:       data ?? [],
      total:      count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
      filters: {
        sites:      (filterOptions?.sites      ?? []) as string[],
        zones:      (filterOptions?.zones      ?? []) as string[],
        categories: (filterOptions?.categories ?? []) as string[],
        promos:     distinctPromos,
      },
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
