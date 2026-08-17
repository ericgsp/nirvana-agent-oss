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

function endOfMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromStr: string, toStr: string) {
  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T00:00:00");
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // /agent is usable without login -- no user means no personal data,
    // not an error. Neutral state.
    return Response.json({
      profile: null, goal: null,
      ytdQuota: null, followUpCount: 0,
      teamRank: null, pendingClosesCount: 0, newLeadsThisWeek: 0,
      nvChallenge: null, daysLeft: null, cycleTotalDays: null,
    });
  }

  const profile = await getMyProfile();

  const period = currentPeriod();
  const year = new Date().getFullYear();

  // Sales cycle closing date: admin-set per period, defaults to calendar
  // month-end (the company sometimes extends it, so this can't be a fixed
  // day-of-month constant).
  const { data: closingRow } = await supabaseAdmin
    .from("sales_cycle_closing")
    .select("closing_date")
    .eq("period", period)
    .maybeSingle();
  const closingDate = closingRow ? closingRow.closing_date : endOfMonth();
  const todayIso = new Date().toISOString().slice(0, 10);
  const daysLeft = Math.max(0, daysBetween(todayIso, closingDate));
  const cycleTotalDays = Math.max(1, daysBetween(`${period}-01`, closingDate));
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

  // Leads needing a follow-up this month: overdue ones still count -- they
  // still need to be followed up, just later than planned.
  const { count: followUpCount } = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("next_action_date", "is", null)
    .lte("next_action_date", endOfMonth());

  // Pending closes: quotes not yet marked closed or lost -- still in play.
  // Status is null until first actioned, so "not closed/lost" must include
  // null explicitly (a plain NOT IN would silently drop null rows).
  const { count: pendingClosesCount } = await supabaseAdmin
    .from("recent_quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or("status.is.null,status.eq.followup");

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: newLeadsThisWeek } = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", weekAgo.toISOString());

  // This month's rank among agents sharing the same leader -- the
  // "immediate team" a person actually competes with day to day.
  let teamRank: { rank: number; of: number } | null = null;
  if (profile?.leader_id) {
    const { data: siblings } = await supabaseAdmin
      .from("agent_profiles")
      .select("user_id")
      .eq("leader_id", profile.leader_id);
    const siblingIds = (siblings ?? []).map((s) => s.user_id);
    if (siblingIds.length > 1) {
      const { data: siblingSales } = await supabaseAdmin
        .from("sales_log")
        .select("user_id, quota_amount, sold_at")
        .in("user_id", siblingIds)
        .gte("sold_at", `${period}-01`);
      const totals: Record<string, number> = {};
      siblingIds.forEach((id) => { totals[id] = 0; });
      (siblingSales ?? [])
        .filter((r) => r.sold_at.slice(0, 7) === period)
        .forEach((r) => { totals[r.user_id] = (totals[r.user_id] || 0) + Number(r.quota_amount || 0); });
      const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      const idx = ranked.findIndex(([id]) => id === user.id);
      if (idx >= 0) teamRank = { rank: idx + 1, of: ranked.length };
    }
  }

  // NV Challenge: accumulated quota across the challenge's own date range
  // (2-3 months), not the calendar-month quota -- a separate figure with
  // its own target, set by an admin via /nv-challenge.
  const todayStr = new Date().toISOString().slice(0, 10);
  let nvChallenge: { title: string; start_date: string; end_date: string; target: number; actual: number } | null = null;
  const { data: activeChallenge } = await supabaseAdmin
    .from("nv_challenges")
    .select("title, start_date, end_date, target_amount")
    .lte("start_date", todayStr)
    .gte("end_date", todayStr)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeChallenge) {
    const { data: challengeSales } = await supabaseAdmin
      .from("sales_log")
      .select("quota_amount")
      .eq("user_id", user.id)
      .gte("sold_at", activeChallenge.start_date)
      .lte("sold_at", activeChallenge.end_date);
    const challengeActual = (challengeSales ?? []).reduce((sum, r) => sum + Number(r.quota_amount || 0), 0);
    nvChallenge = {
      title: activeChallenge.title,
      start_date: activeChallenge.start_date,
      end_date: activeChallenge.end_date,
      target: Number(activeChallenge.target_amount),
      actual: challengeActual,
    };
  }

  return Response.json({
    profile: profile ? { tier: profile.tier, display_name: profile.display_name } : null,
    goal: goalRow ? { target_amount: goalRow.target_amount, period: goalRow.period, actual_amount: actualAmount } : null,
    ytdQuota: { actual: ytdQuota, target: yearlyRow ? Number(yearlyRow.annual_target) : null, year },
    daysLeft,
    cycleTotalDays,
    followUpCount: followUpCount ?? 0,
    pendingClosesCount: pendingClosesCount ?? 0,
    newLeadsThisWeek: newLeadsThisWeek ?? 0,
    teamRank,
    nvChallenge,
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
