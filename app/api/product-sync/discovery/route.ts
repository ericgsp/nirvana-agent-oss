import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const { action } = await request.json();

  if (action === "reset_stuck") {
    const { error } = await supabaseAdmin
      .from("product_sync_discovery")
      .update({ download_status: null, download_error: null })
      .eq("download_status", "downloading");

    if (error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400, headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const site = new URL(request.url).searchParams.get("site");

  let query = supabaseAdmin
    .from("product_sync_discovery")
    .select("*")
    .order("product_type")
    .order("zone")
    .order("section");

  if (site) query = query.eq("site", site);

  const { data, error } = await query;
  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  return new Response(JSON.stringify({ rows: data }), {
    headers: { "Content-Type": "application/json" },
  });
}
