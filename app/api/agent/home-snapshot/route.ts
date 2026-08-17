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

function endOfMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // /agent is usable without login -- no user means no personal data,
    // not an error. Neutral state.
    return Response.json({
      profile: null, goal: null, quotesThisWeek: 0, recentQuotes: [],
      ytdQuota: null, totalQuotesCount: 0, followUpCount: 0,
    });
  }

  const profile = await getMyProfile();

  const period = currentPeriod();
  const year = new Date().getFullYear();
  const { data: goalRow } = await supabaseAdmin
    .from("sales_goals")
    .select("target_amount, period")
    .eq("user_id", user.id)
    .eq("period", period)
    .maybeSingle();

  // Quota-based, matching sales_goals.target_amount's now-repurposed meaning
  // (see me-snapshot for the full rationale) -- target and actual must be
  // in the same units for this comparison to mean anything.
  let actualAmount = 0;
  if (goalRow) {
    const { data: salesRows } = await supabaseAdmin
      .from("sales_log")
      .select("quota_amount, sold_at")
      .eq("user_id", user.id)
      .gte("sold_at", `${period}-01`);
    actualAmount = (salesRows ?? [])
      .filter((r) => r.sold_at.slice(0, 7) === period)
      .reduce((sum, r) => sum + Number(r.quota_amount || 0), 0);
  }

  const { data: yearlyRow } = await supabaseAdmin
    .from("yearly_sales_goals")
    .select("annual_target")
    .eq("user_id", user.id)
    .eq("year", year)
    .maybeSingle();

  const { data: ytdRows } = await supabaseAdmin
    .from("sales_log")
    .select("quota_amount")
    .eq("user_id", user.id)
    .gte("sold_at", `${year}-01-01`);
  const ytdQuota = (ytdRows ?? []).reduce((sum, r) => sum + Number(r.quota_amount || 0), 0);

  const { count: quotesThisWeek } = await supabaseAdmin
    .from("recent_quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfWeek());

  const { count: totalQuotesCount } = await supabaseAdmin
    .from("recent_quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Leads needing a follow-up this month: overdue ones still count -- they
  // still need to be followed up, just later than planned.
  const { count: followUpCount } = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("next_action_date", "is", null)
    .lte("next_action_date", endOfMonth());

  const { data: recentQuotes } = await supabaseAdmin
    .from("recent_quotes")
    .select("site, product, section, net_total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return Response.json({
    profile: profile ? { tier: profile.tier, display_name: profile.display_name } : null,
    goal: goalRow ? { target_amount: goalRow.target_amount, period: goalRow.period, actual_amount: actualAmount } : null,
    ytdQuota: { actual: ytdQuota, target: yearlyRow ? Number(yearlyRow.annual_target) : null, year },
    quotesThisWeek: quotesThisWeek ?? 0,
    totalQuotesCount: totalQuotesCount ?? 0,
    followUpCount: followUpCount ?? 0,
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
  await logQuoteView(
    site, product, section ?? "", Number(netTotal) || 0,
    typeof body?.customerName === "string" ? body.customerName : undefined,
    typeof body?.customerPhone === "string" ? body.customerPhone : undefined,
    typeof body?.validUntil === "string" ? body.validUntil : null,
    Array.isArray(body?.items) ? body.items : undefined,
    typeof body?.quoteSnapshotHtml === "string" ? body.quoteSnapshotHtml : undefined
  );
  return Response.json({ ok: true });
}
