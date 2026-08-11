import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getUserRole } from "@/lib/supabase/get-role";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "500");

  const { data, error } = await supabaseAdmin
    .from("login_attempts")
    .select("id, attempted_at, email, success, ip_address, user_agent, blocked_reason")
    .order("attempted_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data ?? [] });
}
