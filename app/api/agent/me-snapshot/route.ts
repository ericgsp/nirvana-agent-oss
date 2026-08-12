import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getMyProfile, type AgentProfile } from "@/lib/supabase/get-hierarchy";
import { getUserRole } from "@/lib/supabase/get-role";
import { markSold, updateQuoteStatus, updateQuoteCustomer, deleteQuote } from "@/app/agent/actions";

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
    .select("id, site, product, section, net_total, created_at, customer_name, customer_phone, valid_until, items, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Yearly goal tracker -- a "yearly goal" is just 12 sales_goals rows (one
  // per month) all set together via the /12 equal split, reusing the exact
  // same table/upsert an individual month's goal already used. Agents can
  // still edit a single month afterward through the existing set_goal path.
  const currentYear = new Date().getFullYear();
  const yearPrefix = String(currentYear);

  const { data: yearGoalRows } = await supabaseAdmin
    .from("sales_goals")
    .select("period, target_amount")
    .eq("user_id", user.id)
    .like("period", `${yearPrefix}-%`);

  const { data: yearSalesRows } = await supabaseAdmin
    .from("sales_log")
    .select("amount, sold_at")
    .eq("user_id", user.id)
    .gte("sold_at", `${yearPrefix}-01-01`)
    .lte("sold_at", `${yearPrefix}-12-31`);

  const targetByMonth: Record<string, number> = {};
  (yearGoalRows ?? []).forEach((r) => { targetByMonth[r.period as string] = Number(r.target_amount); });

  const actualByMonth: Record<string, number> = {};
  (yearSalesRows ?? []).forEach((r) => {
    const m = (r.sold_at as string).slice(0, 7);
    actualByMonth[m] = (actualByMonth[m] ?? 0) + Number(r.amount);
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const p = `${yearPrefix}-${String(i + 1).padStart(2, "0")}`;
    return { period: p, target: targetByMonth[p] ?? 0, actual: actualByMonth[p] ?? 0 };
  });
  const yearlyTarget = months.reduce((s, m) => s + m.target, 0);
  const yearlyActual = months.reduce((s, m) => s + m.actual, 0);
  const yearlyGoal = { year: currentYear, months, yearlyTarget, yearlyActual };

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
    yearlyGoal,
    recentQuotes: recentQuotes ?? [],
    team,
  });
}

// POST — mark a recent quotation as sold (writes to sales_log), or set the
// caller's own goal for the current period (action: "set_goal"). Self-service
// goal-setting exists because requiring a leader to key in a target for every
// downline agent doesn't scale (a leader with hundreds of agents) -- agents
// commit to their own number and can revise it anytime.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (body?.action === "set_goal") {
    const targetAmount = body?.target_amount;
    if (typeof targetAmount !== "number" || targetAmount <= 0) {
      return Response.json({ error: "A positive target_amount is required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

    const period = currentPeriod();
    const { error } = await supabaseAdmin
      .from("sales_goals")
      .upsert(
        { user_id: user.id, period, target_amount: targetAmount, set_by: user.id },
        { onConflict: "user_id,period" }
      );
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (body?.action === "delete_goal") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

    const period = currentPeriod();
    const { error } = await supabaseAdmin
      .from("sales_goals")
      .delete()
      .eq("user_id", user.id)
      .eq("period", period);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  // Sets all 12 months of the current year to target/12 in one shot -- an
  // "equal split" yearly goal. Agents can still tweak a single month
  // afterward via action: "set_goal" above, same table either way.
  if (body?.action === "set_yearly_goal") {
    const annualTarget = body?.annual_target;
    if (typeof annualTarget !== "number" || annualTarget <= 0) {
      return Response.json({ error: "A positive annual_target is required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

    const monthlyTarget = Math.round((annualTarget / 12) * 100) / 100;
    const year = new Date().getFullYear();
    const rows = Array.from({ length: 12 }, (_, i) => ({
      user_id: user.id,
      period: `${year}-${String(i + 1).padStart(2, "0")}`,
      target_amount: monthlyTarget,
      set_by: user.id,
    }));
    const { error } = await supabaseAdmin
      .from("sales_goals")
      .upsert(rows, { onConflict: "user_id,period" });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (body?.action === "delete_yearly_goal") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

    const year = new Date().getFullYear();
    const { error } = await supabaseAdmin
      .from("sales_goals")
      .delete()
      .eq("user_id", user.id)
      .like("period", `${year}-%`);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (body?.action === "update_status") {
    const quotationRef = body?.quotationRef, status = body?.status;
    if (typeof quotationRef !== "string" || typeof status !== "string") {
      return Response.json({ error: "quotationRef and status are required" }, { status: 400 });
    }
    const result = await updateQuoteStatus(quotationRef, status);
    if (!result.ok) return Response.json({ error: result.error }, { status: 401 });
    return Response.json({ ok: true });
  }

  if (body?.action === "update_customer") {
    const quotationRef = body?.quotationRef;
    if (typeof quotationRef !== "string") {
      return Response.json({ error: "quotationRef is required" }, { status: 400 });
    }
    const result = await updateQuoteCustomer(
      quotationRef,
      typeof body?.customerName === "string" ? body.customerName : "",
      typeof body?.customerPhone === "string" ? body.customerPhone : ""
    );
    if (!result.ok) return Response.json({ error: result.error }, { status: 401 });
    return Response.json({ ok: true });
  }

  if (body?.action === "delete_quote") {
    const quotationRef = body?.quotationRef;
    if (typeof quotationRef !== "string") {
      return Response.json({ error: "quotationRef is required" }, { status: 400 });
    }
    const result = await deleteQuote(quotationRef);
    if (!result.ok) return Response.json({ error: result.error }, { status: 401 });
    return Response.json({ ok: true });
  }

  const quotationRef = body?.quotationRef, amount = body?.amount, soldAt = body?.soldAt;
  if (typeof quotationRef !== "string" || typeof amount !== "number" || amount <= 0) {
    return Response.json({ error: "quotationRef and a positive amount are required" }, { status: 400 });
  }
  const result = await markSold(quotationRef, amount, typeof soldAt === "string" ? soldAt : undefined);
  if (!result.ok) return Response.json({ error: result.error }, { status: 401 });
  return Response.json({ ok: true });
}
