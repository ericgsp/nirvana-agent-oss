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
    .from("nv_challenges")
    .select("*")
    .order("start_date", { ascending: false });

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
  const { title, start_date, end_date, target_amount } = body;
  if (!title || !start_date || !end_date || !target_amount || Number(target_amount) <= 0)
    return new Response(JSON.stringify({ error: "title, start_date, end_date and a positive target_amount are required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  if (start_date > end_date)
    return new Response(JSON.stringify({ error: "start_date must be before end_date" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });

  const { data, error } = await supabaseAdmin
    .from("nv_challenges")
    .insert({ title, start_date, end_date, target_amount })
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
    .from("nv_challenges")
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
    .from("nv_challenges")
    .delete()
    .eq("id", id);

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}
