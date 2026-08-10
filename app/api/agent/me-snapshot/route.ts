import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getMyProfile, type AgentProfile } from "@/lib/supabase/get-hierarchy";
import { getUserRole } from "@/lib/supabase/get-role";
import { markSold } from "@/app/agent/actions";

export const runtime = "nodejs";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ profile: null, goal: null, recentQuotes: [], team: null });
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

  const { data: recentQuotes } = await supabaseAdmin
    .from("recent_quotes")
    .select("id, site, product, section, net_total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Leader-only team-progress: aggregate attainment across the downline,
  // counting only members who actually have a goal set for this period --
  // same "no goal = no pressure" rule, just summed instead of per-self.
  const role = await getUserRole();
  const seesEverything = profile?.tier === "CBDD" || role === "admin";
  let team: { memberCount: number; goalCount: number; targetTotal: number; actualTotal: number } | null = null;

  if (profile || seesEverything) {
    const query = supabaseAdmin
      .from("agent_profiles")
      .select("user_id, tier, leader_id, agent_code, display_name");
    const { data: downlineData } = seesEverything
      ? await query.neq("user_id", user.id)
      : await query.eq("leader_id", user.id);
    const downline = (downlineData as AgentProfile[]) ?? [];

    if (downline.length > 0) {
      const memberIds = downline.map((m) => m.user_id);
      const { data: goalRows } = await supabaseAdmin
        .from("sales_goals")
        .select("user_id, target_amount")
        .eq("period", period)
        .in("user_id", memberIds);

      const goalUserIds = (goalRows ?? []).map((g) => g.user_id);
      const targetTotal = (goalRows ?? []).reduce((sum, g) => sum + Number(g.target_amount), 0);

      let actualTotal = 0;
      if (goalUserIds.length > 0) {
        const { data: salesRows } = await supabaseAdmin
          .from("sales_log")
          .select("user_id, amount, sold_at")
          .in("user_id", goalUserIds)
          .gte("sold_at", `${period}-01`);
        actualTotal = (salesRows ?? [])
          .filter((r) => r.sold_at.slice(0, 7) === period)
          .reduce((sum, r) => sum + Number(r.amount), 0);
      }

      team = { memberCount: downline.length, goalCount: goalUserIds.length, targetTotal, actualTotal };
    } else {
      team = { memberCount: 0, goalCount: 0, targetTotal: 0, actualTotal: 0 };
    }
  }

  return Response.json({
    profile: profile ? { tier: profile.tier, display_name: profile.display_name } : null,
    goal: goalRow ? { target_amount: goalRow.target_amount, period: goalRow.period, actual_amount: actualAmount } : null,
    recentQuotes: recentQuotes ?? [],
    team,
  });
}

// POST — mark a recent quotation as sold, writes to sales_log
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const quotationRef = body?.quotationRef, amount = body?.amount, soldAt = body?.soldAt;
  if (typeof quotationRef !== "string" || typeof amount !== "number" || amount <= 0) {
    return Response.json({ error: "quotationRef and a positive amount are required" }, { status: 400 });
  }
  const result = await markSold(quotationRef, amount, typeof soldAt === "string" ? soldAt : undefined);
  if (!result.ok) return Response.json({ error: result.error }, { status: 401 });
  return Response.json({ ok: true });
}
