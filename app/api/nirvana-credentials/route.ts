import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function authCheck() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  if (!await authCheck())
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("nirvana_credentials")
    .select("id, label, username, active, created_at")
    .order("created_at");

  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ credentials: data }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  if (!await authCheck())
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { label, username, password } = await request.json();
  if (!label || !username || !password)
    return new Response(JSON.stringify({ error: "label, username and password are required" }), { status: 400 });

  const { error } = await supabaseAdmin
    .from("nirvana_credentials")
    .insert({ label, username, password, active: true });

  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function PATCH(request: NextRequest) {
  if (!await authCheck())
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id, active } = await request.json();
  const { error } = await supabaseAdmin
    .from("nirvana_credentials")
    .update({ active })
    .eq("id", id);

  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(request: NextRequest) {
  if (!await authCheck())
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id } = await request.json();
  const { error } = await supabaseAdmin
    .from("nirvana_credentials")
    .delete()
    .eq("id", id);

  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
