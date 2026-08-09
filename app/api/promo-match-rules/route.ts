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

  const params  = new URL(request.url).searchParams;
  const site    = params.get("site")    ?? "";
  const active  = params.get("active")  ?? "";
  const page    = Math.max(1, parseInt(params.get("page") ?? "1"));
  const pageSize = 50;

  let query = supabaseAdmin
    .from("promo_match_rules")
    .select("*", { count: "exact" })
    .order("site_code")
    .order("promo_name")
    .order("product_name", { nullsFirst: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (site)           query = query.eq("site_code", site);
  if (active === "1") query = query.eq("active", true);
  if (active === "0") query = query.eq("active", false);

  const { data, count, error } = await query;
  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  const { data: sites } = await supabaseAdmin
    .from("promo_match_rules")
    .select("site_code");
  const uniqueSites = [...new Set((sites ?? []).map(r => r.site_code))].filter(Boolean).sort();

  return new Response(JSON.stringify({
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
    sites: uniqueSites,
  }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from("promo_match_rules")
    .insert(body)
    .select()
    .single();

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  return new Response(JSON.stringify({ row: data }), { headers: { "Content-Type": "application/json" } });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const body = await request.json();
  const { id, ...fields } = body;
  if (!id)
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });

  const { data, error } = await supabaseAdmin
    .from("promo_match_rules")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  return new Response(JSON.stringify({ row: data }), { headers: { "Content-Type": "application/json" } });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const { id } = await request.json();
  if (!id)
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });

  const { error } = await supabaseAdmin
    .from("promo_match_rules")
    .delete()
    .eq("id", id);

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}
