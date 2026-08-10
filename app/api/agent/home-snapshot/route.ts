import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getMyProfile } from "@/lib/supabase/get-hierarchy";
import { logQuoteView } from "@/app/agent/actions";

export const runtime = "nodejs";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function startOfWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const d = new Date(now);
  d.setDate(now.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // /agent is usable without login -- no user means no personal data,
    // not an error. Neutral state.
    return Response.json({ profile: null, goal: null, quotesThisWeek: 0, recentQuotes: [] });
  }

  const profile = await getMyProfile();

  const period = currentPeriod();
  const { data: goalRow } = await supabaseAdmin
    .from("sales_goals")
    .select("target_amount, period")
    .eq("user_id", user.id)
    .eq("period", period)
    .maybeSingle();

  let actualAmount = 0;
  if (goalRow) {
    const { data: salesRows } = await supabaseAdmin
      .from("sales_log")
      .select("amount, sold_at")
      .eq("user_id", user.id)
      .gte("sold_at", `${period}-01`);
    actualAmount = (salesRows ?? [])
      .filter((r) => r.sold_at.slice(0, 7) === period)
      .reduce((sum, r) => sum + Number(r.amount), 0);
  }

  const { count: quotesThisWeek } = await supabaseAdmin
    .from("recent_quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfWeek());

  const { data: recentQuotes } = await supabaseAdmin
    .from("recent_quotes")
    .select("site, product, section, net_total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return Response.json({
    profile: profile ? { tier: profile.tier, display_name: profile.display_name } : null,
    goal: goalRow ? { target_amount: goalRow.target_amount, period: goalRow.period, actual_amount: actualAmount } : null,
    quotesThisWeek: quotesThisWeek ?? 0,
    recentQuotes: recentQuotes ?? [],
  });
}

// POST — log a generated quote (fired when the agent taps Print/Share)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const site = body?.site, product = body?.product, section = body?.section, netTotal = body?.netTotal;
  if (typeof site !== "string" || typeof product !== "string") {
    return Response.json({ error: "site and product are required" }, { status: 400 });
  }
  await logQuoteView(site, product, section ?? "", Number(netTotal) || 0);
  return Response.json({ ok: true });
}
