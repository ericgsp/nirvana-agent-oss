import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const { data, error } = await supabaseAdmin
    .from("sales_cycle_closing")
    .select("*")
    .order("period", { ascending: false });

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  return new Response(JSON.stringify({ rows: data ?? [] }), { headers: { "Content-Type": "application/json" } });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const body = await request.json();
  const { period, closing_date } = body;
  if (!period || !/^\d{4}-\d{2}$/.test(period) || !closing_date)
    return new Response(JSON.stringify({ error: "period (YYYY-MM) and closing_date are required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  if (!closing_date.startsWith(period))
    return new Response(JSON.stringify({ error: "closing_date must fall within the given period" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });

  const { data, error } = await supabaseAdmin
    .from("sales_cycle_closing")
    .upsert({ period, closing_date, updated_at: new Date().toISOString() }, { onConflict: "period" })
    .select()
    .single();

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  return new Response(JSON.stringify({ row: data }), { headers: { "Content-Type": "application/json" } });
}
