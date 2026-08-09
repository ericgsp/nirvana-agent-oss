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

  const params = new URL(request.url).searchParams;
  const site        = params.get("site") ?? "";
  const productType = params.get("product_type") ?? "";
  const zone        = params.get("zone") ?? "";
  const available   = params.get("available"); // "true" | "false" | ""
  const page        = Math.max(1, parseInt(params.get("page") ?? "1"));
  const pageSize    = 100;

  // ── Paginated rows ────────────────────────────────────────────────────────
  let query = supabaseAdmin
    .from("product_availability")
    .select("*", { count: "exact" })
    .order("site")
    .order("product_type")
    .order("zone")
    .order("section")
    .order("lot_code")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (site)        query = query.eq("site", site);
  if (productType) query = query.eq("product_type", productType);
  if (zone)        query = query.eq("zone", zone);
  if (available === "true")  query = query.eq("available", true);
  if (available === "false") query = query.eq("available", false);

  const { data, count, error } = await query;
  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  // ── Summary counts — use two exact-count queries instead of fetching all rows
  // (avoids Supabase's 1000-row default cap on large datasets)
  let totalQuery = supabaseAdmin
    .from("product_availability")
    .select("*", { count: "exact", head: true });
  let availQuery = supabaseAdmin
    .from("product_availability")
    .select("*", { count: "exact", head: true })
    .eq("available", true);

  if (site)        { totalQuery = totalQuery.eq("site", site);        availQuery = availQuery.eq("site", site); }
  if (productType) { totalQuery = totalQuery.eq("product_type", productType); availQuery = availQuery.eq("product_type", productType); }
  if (zone)        { totalQuery = totalQuery.eq("zone", zone);        availQuery = availQuery.eq("zone", zone); }

  const [{ count: totalInFilter }, { count: availableInFilter }] = await Promise.all([totalQuery, availQuery]);

  // ── Dependent filter options ──────────────────────────────────────────────
  // Sites: always all sites from product_availability (unfiltered)
  const { data: allFilterOptions } = await supabaseAdmin.rpc("get_availability_filter_options");
  const uniqueSites = (allFilterOptions?.sites ?? []) as string[];

  // Product types: use RPC to get distinct values (avoids row-limit issues on large sites)
  const { data: typeRows } = await supabaseAdmin.rpc("get_distinct_product_types", { p_site: site || null });
  const uniqueTypes = (typeRows ?? []).map((r: { product_type: string }) => r.product_type).filter(Boolean).sort();

  // Zones: use RPC to get distinct values filtered by site + product type
  const { data: zoneRows } = await supabaseAdmin.rpc("get_distinct_zones", { p_site: site || null, p_product_type: productType || null });
  const uniqueZones = (zoneRows ?? []).map((r: { zone: string }) => r.zone).filter(Boolean).sort();

  const total = totalInFilter ?? 0;
  const avail = availableInFilter ?? 0;

  return new Response(JSON.stringify({
    rows: data,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
    summary: { total, available: avail, sold: total - avail },
    filters: { sites: uniqueSites, productTypes: uniqueTypes, zones: uniqueZones },
  }), { headers: { "Content-Type": "application/json" } });
}
