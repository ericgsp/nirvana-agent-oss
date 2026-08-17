import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getMyProfile, getRecursiveDownline } from "@/lib/supabase/get-hierarchy";
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
    return Response.json({ profile: null, goal: null, yearlyGoal: null, team: null });
  }

  const profile = await getMyProfile();
  const period = currentPeriod();
  const currentYear = new Date().getFullYear();
  const yearPrefix = String(currentYear);

  // These four don't depend on each other's results -- run them concurrently
  // instead of one after another. Also drops the two separate current-month
  // queries the old code made (target_amount + sales_log for `period` alone):
  // the yearly query below already covers every month including this one,
  // so `goal` is now just derived from `months` instead of a duplicate round trip.
  const [
    { data: yearlyRow },
    { data: yearGoalRows },
    { data: yearSalesRows },
    { data: prevYearlyRow },
    { data: prevYearSalesRows },
  ] = await Promise.all([
    supabaseAdmin
      .from("yearly_sales_goals")
      .select("annual_target")
      .eq("user_id", user.id)
      .eq("year", currentYear)
      .maybeSingle(),
    supabaseAdmin
      .from("sales_goals")
      .select("period, target_amount, locked, carry_forward_handled")
      .eq("user_id", user.id)
      .like("period", `${yearPrefix}-%`),
    // Both amount (raw sales figure, for the YTD Sales reference display)
    // and quota_amount (what the goal itself is now measured against) come
    // from the same rows -- one query covers both.
    supabaseAdmin
      .from("sales_log")
      .select("amount, quota_amount, sold_at")
      .eq("user_id", user.id)
      .gte("sold_at", `${yearPrefix}-01-01`)
      .lte("sold_at", `${yearPrefix}-12-31`),
    // Previous year, for the "this year vs last year" comparison on the
    // self performance card -- everything else on that card reuses goal/
    // yearlyGoal/team below rather than fetching its own duplicate copy.
    supabaseAdmin
      .from("yearly_sales_goals")
      .select("annual_target")
      .eq("user_id", user.id)
      .eq("year", currentYear - 1)
      .maybeSingle(),
    supabaseAdmin
      .from("sales_log")
      .select("quota_amount")
      .eq("user_id", user.id)
      .gte("sold_at", `${currentYear - 1}-01-01`)
      .lte("sold_at", `${currentYear - 1}-12-31`),
  ]);

  const prevYearGoal = {
    year: currentYear - 1,
    target: prevYearlyRow ? Number(prevYearlyRow.annual_target) : null,
    actual: (prevYearSalesRows ?? []).reduce((sum, r) => sum + Number(r.quota_amount || 0), 0),
  };

  const targetByMonth: Record<string, number> = {};
  const lockedByMonth: Record<string, boolean> = {};
  (yearGoalRows ?? []).forEach((r) => {
    targetByMonth[r.period as string] = Number(r.target_amount);
    lockedByMonth[r.period as string] = !!r.locked;
  });

  // The yearly goal card now tracks Quota (net pre_need_price minus
  // discount/trust/backwall), not the raw quotation total -- "everything is
  // calculated using quota" per the explicit decision to repurpose the
  // existing sales_goals/yearly_sales_goals tables rather than build a
  // separate quota system. Sales closed before quota_amount was captured
  // contribute 0 here, same limitation as every other field added this way.
  const actualByMonth: Record<string, number> = {};
  (yearSalesRows ?? []).forEach((r) => {
    const m = (r.sold_at as string).slice(0, 7);
    actualByMonth[m] = (actualByMonth[m] ?? 0) + Number(r.quota_amount || 0);
  });

  // YTD Sales -- the raw, unmodified quotation-total figure, shown as a
  // separate reference alongside the (now quota-based) yearly goal, never
  // used for goal comparison itself.
  const ytdSalesActual = (yearSalesRows ?? []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const months = Array.from({ length: 12 }, (_, i) => {
    const p = `${yearPrefix}-${String(i + 1).padStart(2, "0")}`;
    return { period: p, target: targetByMonth[p] ?? 0, actual: actualByMonth[p] ?? 0, locked: lockedByMonth[p] ?? false };
  });
  const monthSum = months.reduce((s, m) => s + m.target, 0);
  const yearlyTarget = yearlyRow ? Number(yearlyRow.annual_target) : monthSum;
  const yearlyActual = months.reduce((s, m) => s + m.actual, 0);

  // Carry-forward: any past month this year that fell short and hasn't
  // been offered to the agent yet (accepted or denied). Summed into one
  // combined prompt rather than asking about each month separately.
  const handledByMonth: Record<string, boolean> = {};
  (yearGoalRows ?? []).forEach((r) => { handledByMonth[r.period as string] = !!r.carry_forward_handled; });
  const nowPeriod = currentPeriod();
  const shortfallMonths = months.filter((m) => m.period < nowPeriod && m.target > m.actual && !handledByMonth[m.period]);
  const carryForwardAmount = shortfallMonths.reduce((s, m) => s + (m.target - m.actual), 0);
  const carryForward = carryForwardAmount > 0
    ? { amount: Math.round(carryForwardAmount * 100) / 100, months: shortfallMonths.map((m) => m.period) }
    : null;
  const yearlyGoal = { year: currentYear, months, yearlyTarget, yearlyActual, carryForward };

  // Current-month goal card -- derived from `months` instead of its own
  // round trip, since that array already covers every month this year.
  const curMonth = months.find((m) => m.period === period);
  const goal = curMonth && curMonth.target > 0
    ? { target_amount: curMonth.target, period, actual_amount: curMonth.actual }
    : null;

  // Leader-only team-progress: aggregate attainment across the downline,
  // counting only members who actually have a goal set for this period --
  // same "no goal = no pressure" rule, just summed instead of per-self.
  // Uses the same shared getRecursiveDownline() as the Team tab -- this used
  // to be its own separate (buggy) implementation that let CBDD see the
  // whole org via direct reports only; now there's one source of truth.
  let team: { memberCount: number; goalCount: number; targetTotal: number; actualTotal: number } | null = null;
  const role = await getUserRole();

  if (profile || role === "admin") {
    const downline = await getRecursiveDownline(user.id);

    if (downline.length > 0) {
      const memberIds = downline.map((m) => m.user_id);
      const { data: goalRows } = await supabaseAdmin
        .from("sales_goals")
        .select("user_id, target_amount")
        .eq("period", period)
        .in("user_id", memberIds);

      const goalUserIds = (goalRows ?? []).map((g) => g.user_id);
      const targetTotal = (goalRows ?? []).reduce((sum, g) => sum + Number(g.target_amount), 0);

      // Sales are checked for every descendant, not just those with a goal
      // set, so a downline member's sale isn't silently dropped from the
      // total just because no quota was assigned to them. Quota-based, same
      // as everything else measured against target_amount now.
      const { data: salesRows } = await supabaseAdmin
        .from("sales_log")
        .select("user_id, quota_amount, sold_at")
        .in("user_id", memberIds)
        .gte("sold_at", `${period}-01`);
      const actualTotal = (salesRows ?? [])
        .filter((r) => r.sold_at.slice(0, 7) === period)
        .reduce((sum, r) => sum + Number(r.quota_amount || 0), 0);

      team = { memberCount: downline.length, goalCount: goalUserIds.length, targetTotal, actualTotal };
    } else {
      team = { memberCount: 0, goalCount: 0, targetTotal: 0, actualTotal: 0 };
    }
  }

  return Response.json({
    profile: profile ? { tier: profile.tier, display_name: profile.display_name } : null,
    goal,
    yearlyGoal,
    team,
    prevYearGoal,
    ytdSalesActual,
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

    // Round down for 11 months, then give the 12th whatever's left over --
    // rounding every month independently (annual/12, each to the nearest
    // cent) loses a few cents off the total when summed back for display.
    // This way the 12 months always sum to exactly what was typed in.
    const monthlyBase = Math.floor((annualTarget / 12) * 100) / 100;
    const year = new Date().getFullYear();
    const rows = Array.from({ length: 12 }, (_, i) => {
      const isLast = i === 11;
      const target = isLast
        ? Math.round((annualTarget - monthlyBase * 11) * 100) / 100
        : monthlyBase;
      return {
        user_id: user.id,
        period: `${year}-${String(i + 1).padStart(2, "0")}`,
        target_amount: target,
        set_by: user.id,
        locked: false, // fresh yearly goal clears any previous per-month pins
      };
    });
    const { error } = await supabaseAdmin
      .from("sales_goals")
      .upsert(rows, { onConflict: "user_id,period" });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const { error: yearlyError } = await supabaseAdmin
      .from("yearly_sales_goals")
      .upsert({ user_id: user.id, year, annual_target: annualTarget }, { onConflict: "user_id,year" });
    if (yearlyError) return Response.json({ error: yearlyError.message }, { status: 500 });

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

    const { error: yearlyDelError } = await supabaseAdmin
      .from("yearly_sales_goals")
      .delete()
      .eq("user_id", user.id)
      .eq("year", year);
    if (yearlyDelError) return Response.json({ error: yearlyDelError.message }, { status: 500 });

    return Response.json({ ok: true });
  }

  // Edits one month's target and redistributes the difference evenly across
  // the other months that haven't been individually edited yet ("unlocked"),
  // keeping the yearly total fixed at whatever was originally set. Editing
  // a month locks it, so a later edit to a different month won't move it.
  if (body?.action === "set_month_goal") {
    const period = body?.period, targetAmount = body?.target_amount;
    if (typeof period !== "string" || !/^\d{4}-\d{2}$/.test(period)) {
      return Response.json({ error: "A valid period (YYYY-MM) is required" }, { status: 400 });
    }
    if (typeof targetAmount !== "number" || targetAmount < 0) {
      return Response.json({ error: "A valid target_amount is required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

    const year = parseInt(period.slice(0, 4), 10);

    const [{ data: yearlyRow }, { data: monthRows }] = await Promise.all([
      supabaseAdmin
        .from("yearly_sales_goals")
        .select("annual_target")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle(),
      supabaseAdmin
        .from("sales_goals")
        .select("period, target_amount, locked")
        .eq("user_id", user.id)
        .like("period", `${year}-%`),
    ]);
    if (!yearlyRow) return Response.json({ error: "Set a yearly goal first" }, { status: 400 });
    const annualTarget = Number(yearlyRow.annual_target);
    const rows = monthRows ?? [];

    // The edited month becomes locked at its new value; every other
    // already-locked month keeps its own value; the remaining ("unlocked")
    // months split whatever's left of the annual total evenly.
    const lockedSum = rows.reduce((sum, r) => {
      if (r.period === period) return sum + targetAmount;
      return r.locked ? sum + Number(r.target_amount) : sum;
    }, 0);
    const unlockedPeriods = rows
      .filter((r) => r.period !== period && !r.locked)
      .map((r) => r.period as string);

    if (unlockedPeriods.length > 0 && lockedSum > annualTarget) {
      return Response.json({ error: "That target is more than your whole yearly goal -- lower it or edit your yearly goal first." }, { status: 400 });
    }

    const remaining = Math.max(0, annualTarget - lockedSum);
    const base = unlockedPeriods.length > 0 ? Math.floor((remaining / unlockedPeriods.length) * 100) / 100 : 0;

    const updates = unlockedPeriods.map((p, i) => {
      const isLast = i === unlockedPeriods.length - 1;
      const target = isLast ? Math.round((remaining - base * (unlockedPeriods.length - 1)) * 100) / 100 : base;
      return { user_id: user.id, period: p, target_amount: target, set_by: user.id, locked: false };
    });
    updates.push({ user_id: user.id, period, target_amount: targetAmount, set_by: user.id, locked: true });

    const { error } = await supabaseAdmin
      .from("sales_goals")
      .upsert(updates, { onConflict: "user_id,period" });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  // Unlocks one month and folds it back into the equal-split pool with
  // whatever other months are still unlocked -- the mirror image of
  // set_month_goal above.
  if (body?.action === "unlock_month_goal") {
    const period = body?.period;
    if (typeof period !== "string" || !/^\d{4}-\d{2}$/.test(period)) {
      return Response.json({ error: "A valid period (YYYY-MM) is required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

    const year = parseInt(period.slice(0, 4), 10);

    const [{ data: yearlyRow }, { data: monthRows }] = await Promise.all([
      supabaseAdmin
        .from("yearly_sales_goals")
        .select("annual_target")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle(),
      supabaseAdmin
        .from("sales_goals")
        .select("period, target_amount, locked")
        .eq("user_id", user.id)
        .like("period", `${year}-%`),
    ]);
    if (!yearlyRow) return Response.json({ error: "Set a yearly goal first" }, { status: 400 });
    const annualTarget = Number(yearlyRow.annual_target);
    const rows = monthRows ?? [];

    const lockedSum = rows.reduce((sum, r) => {
      if (r.period === period) return sum; // this one is being unlocked
      return r.locked ? sum + Number(r.target_amount) : sum;
    }, 0);
    // Recipients of the equal split: every currently-unlocked month, plus
    // the one just unlocked.
    const unlockedPeriods = rows
      .filter((r) => r.period === period || !r.locked)
      .map((r) => r.period as string);

    const remaining = Math.max(0, annualTarget - lockedSum);
    const base = unlockedPeriods.length > 0 ? Math.floor((remaining / unlockedPeriods.length) * 100) / 100 : 0;

    const updates = unlockedPeriods.map((p, i) => {
      const isLast = i === unlockedPeriods.length - 1;
      const target = isLast ? Math.round((remaining - base * (unlockedPeriods.length - 1)) * 100) / 100 : base;
      return { user_id: user.id, period: p, target_amount: target, set_by: user.id, locked: false };
    });

    const { error } = await supabaseAdmin
      .from("sales_goals")
      .upsert(updates, { onConflict: "user_id,period" });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  // Carry-forward: a past month (or several) fell short of its target.
  // "Accept" spreads that combined shortfall evenly across the remaining
  // unlocked future months (on top of what they already had); "Deny" just
  // marks those months handled so the prompt doesn't ask again.
  if (body?.action === "accept_carry_forward" || body?.action === "deny_carry_forward") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

    const year = new Date().getFullYear();
    const nowPeriod = currentPeriod();

    const [{ data: monthRows }, { data: yearSalesRows }] = await Promise.all([
      supabaseAdmin
        .from("sales_goals")
        .select("period, target_amount, locked, carry_forward_handled")
        .eq("user_id", user.id)
        .like("period", `${year}-%`),
      supabaseAdmin
        .from("sales_log")
        .select("quota_amount, sold_at")
        .eq("user_id", user.id)
        .gte("sold_at", `${year}-01-01`)
        .lte("sold_at", `${year}-12-31`),
    ]);
    const rows = monthRows ?? [];
    // Quota-based, matching what the target itself now measures -- a month
    // "falling short" means short of quota, not the raw sales figure.
    const actualByMonth: Record<string, number> = {};
    (yearSalesRows ?? []).forEach((r) => {
      const m = (r.sold_at as string).slice(0, 7);
      actualByMonth[m] = (actualByMonth[m] ?? 0) + Number(r.quota_amount || 0);
    });

    const shortfallRows = rows.filter((r) => {
      const actual = actualByMonth[r.period as string] ?? 0;
      return (r.period as string) < nowPeriod && Number(r.target_amount) > actual && !r.carry_forward_handled;
    });
    const shortfallPeriods = shortfallRows.map((r) => r.period as string);

    if (shortfallPeriods.length === 0) {
      return Response.json({ ok: true }); // nothing pending -- already handled, no-op
    }

    const isAccept = body.action === "accept_carry_forward";

    // Deny: just mark handled, leave each month's target exactly as it was
    // -- the missed figure stays visible on that month for the record.
    // Accept: the shortfall *moves* forward, it isn't a new addition on top
    // -- so the past month's target drops to 0 (its actual sales stay
    // exactly as they were, still viewable) and the yearly total is
    // unchanged, only redistributed across the remaining unlocked months.
    const updates: any[] = shortfallPeriods.map((p) => {
      const row = rows.find((r) => r.period === p)!;
      return { user_id: user.id, period: p, target_amount: isAccept ? 0 : Number(row.target_amount), set_by: user.id, locked: !!row.locked, carry_forward_handled: true };
    });

    if (isAccept) {
      const shortfallAmount = shortfallRows.reduce((sum, r) => {
        const actual = actualByMonth[r.period as string] ?? 0;
        return sum + (Number(r.target_amount) - actual);
      }, 0);

      const futureUnlocked = rows.filter((r) => (r.period as string) > nowPeriod && !r.locked && !shortfallPeriods.includes(r.period as string));
      if (futureUnlocked.length > 0) {
        const base = Math.floor((shortfallAmount / futureUnlocked.length) * 100) / 100;
        futureUnlocked.forEach((r, i) => {
          const isLast = i === futureUnlocked.length - 1;
          const extra = isLast ? Math.round((shortfallAmount - base * (futureUnlocked.length - 1)) * 100) / 100 : base;
          updates.push({ user_id: user.id, period: r.period, target_amount: Number(r.target_amount) + extra, set_by: user.id, locked: false, carry_forward_handled: !!r.carry_forward_handled });
        });
      }
    }

    const { error } = await supabaseAdmin
      .from("sales_goals")
      .upsert(updates, { onConflict: "user_id,period" });
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
  const result = await markSold(
    quotationRef, amount, typeof soldAt === "string" ? soldAt : undefined,
    Array.isArray(body?.closedItems) ? body.closedItems : undefined
  );
  if (!result.ok) return Response.json({ error: result.error }, { status: 401 });
  return Response.json({ ok: true });
}
