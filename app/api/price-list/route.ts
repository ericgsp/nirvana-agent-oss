import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const params    = new URL(request.url).searchParams;
  const site      = params.get("site") ?? "";
  const category  = params.get("category") ?? "";
  const product   = params.get("product") ?? "";
  const page      = Math.max(1, parseInt(params.get("page") ?? "1"));
  const pageSize  = 100;

  let query = supabaseAdmin
    .from("product_price_list")
    .select("*", { count: "exact" })
    .eq("active", true)
    .order("site_code")
    .order("product_category")
    .order("product_name")
    .order("lot_no")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (site)     query = query.eq("site_code", site);
  if (category) query = query.eq("product_category", category);
  if (product)  query = query.eq("product_name", product);

  const { data, count, error } = await query;
  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  // Filter options
  const [sitesRes, categoriesRes, productsRes] = await Promise.all([
    supabaseAdmin.rpc("get_distinct_price_list_sites"),
    supabaseAdmin.rpc("get_distinct_price_list_categories"),
    supabaseAdmin.rpc("get_distinct_price_list_products"),
  ]);

  return new Response(JSON.stringify({
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
    filters: {
      sites:      (sitesRes.data ?? []).map((r: any) => r.site_code).filter(Boolean),
      categories: (categoriesRes.data ?? []).map((r: any) => r.product_category).filter(Boolean),
      products:   (productsRes.data ?? []).map((r: any) => r.product_name).filter(Boolean),
    },
  }), { headers: { "Content-Type": "application/json" } });
}
