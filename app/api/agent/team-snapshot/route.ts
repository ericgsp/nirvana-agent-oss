import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getMyProfile, type AgentProfile } from "@/lib/supabase/get-hierarchy";
import { getUserRole } from "@/lib/supabase/get-role";

export const runtime = "nodejs";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ access: false, scope: null, members: [] });
  }

  const me = await getMyProfile();
  const role = await getUserRole();
  // CBDD is the top MLM tier but is NOT special-cased to see the whole org --
  // a CBDD only sees their own direct downline, same as every other tier.
  // Only the "admin" role (a separate concept from MLM tier, for internal
  // support/management) sees everything.
  const seesEverything = role === "admin";

  if (!me && !seesEverything) {
    // No profile, not admin -- nothing to show, not an error.
    return Response.json({ access: false, scope: null, members: [] });
  }

  const query = supabaseAdmin
    .from("agent_profiles")
    .select("user_id, tier, leader_id, agent_code, display_name");

  const { data: downlineData } = seesEverything
    ? await query.neq("user_id", user.id)
    : await query.eq("leader_id", user.id);

  const downline = (downlineData as AgentProfile[]) ?? [];

  const period = currentPeriod();
  const memberIds = downline.map((m) => m.user_id);

  let goalsByUser: Record<string, number> = {};
  let salesByUser: Record<string, number> = {};

  if (memberIds.length > 0) {
    const { data: goalRows } = await supabaseAdmin
      .from("sales_goals")
      .select("user_id, target_amount")
      .eq("period", period)
      .in("user_id", memberIds);

    (goalRows ?? []).forEach((g) => {
      goalsByUser[g.user_id] = Number(g.target_amount);
    });

    const goalUserIds = Object.keys(goalsByUser);
    if (goalUserIds.length > 0) {
      const { data: salesRows } = await supabaseAdmin
        .from("sales_log")
        .select("user_id, amount, sold_at")
        .in("user_id", goalUserIds)
        .gte("sold_at", `${period}-01`);

      (salesRows ?? [])
        .filter((r) => r.sold_at.slice(0, 7) === period)
        .forEach((r) => {
          salesByUser[r.user_id] = (salesByUser[r.user_id] || 0) + Number(r.amount);
        });
    }
  }

  const members = downline.map((m) => {
    const target = goalsByUser[m.user_id];
    return {
      user_id: m.user_id,
      tier: m.tier,
      display_name: m.display_name,
      agent_code: m.agent_code,
      goal: target !== undefined
        ? { period, target_amount: target, actual_amount: salesByUser[m.user_id] || 0 }
        : null,
    };
  });

  // Full upward chain -- immediate leader first, then their leader, and so
  // on up to CBDD -- not just the one directly above. An SD should see their
  // DSD, then BDD, then CBDD; a BDD's direct report to CBDD should show just
  // CBDD. Capped at 5 hops (there are only 5 tiers) as a cycle safety net.
  type LeaderInfo = { display_name: string | null; agent_code: string | null; tier: string };
  const leaderChain: LeaderInfo[] = [];
  let nextLeaderId = me?.leader_id ?? null;
  for (let hop = 0; hop < 5 && nextLeaderId; hop++) {
    const { data: leaderRow } = await supabaseAdmin
      .from("agent_profiles")
      .select("display_name, agent_code, tier, leader_id")
      .eq("user_id", nextLeaderId)
      .maybeSingle();
    if (!leaderRow) break;
    leaderChain.push({ display_name: leaderRow.display_name, agent_code: leaderRow.agent_code, tier: leaderRow.tier });
    nextLeaderId = leaderRow.leader_id;
  }

  return Response.json({
    access: true,
    scope: seesEverything ? "org" : "team",
    members,
    leaderChain,
  });
}

// POST — set a downline member's goal for the current period. Only the
// caller's own visible downline can be targeted (same scoping as GET) --
// a BDD can set a goal for their direct report, but not for someone else's.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const targetUserId = body?.user_id;
  const targetAmount = body?.target_amount;
  const isDelete = body?.action === "delete_goal";
  if (typeof targetUserId !== "string" || (!isDelete && (typeof targetAmount !== "number" || targetAmount <= 0))) {
    return Response.json({ error: "user_id and a positive target_amount are required" }, { status: 400 });
  }

  const me = await getMyProfile();
  const role = await getUserRole();
  // CBDD is the top MLM tier but is NOT special-cased to see the whole org --
  // a CBDD only sees their own direct downline, same as every other tier.
  // Only the "admin" role (a separate concept from MLM tier, for internal
  // support/management) sees everything.
  const seesEverything = role === "admin";

  if (!seesEverything) {
    const { data: targetRow } = await supabaseAdmin
      .from("agent_profiles")
      .select("user_id")
      .eq("user_id", targetUserId)
      .eq("leader_id", user.id)
      .maybeSingle();
    if (!targetRow) {
      return Response.json({ error: "You can only manage goals for your direct team" }, { status: 403 });
    }
  }

  const period = currentPeriod();

  if (isDelete) {
    const { error } = await supabaseAdmin
      .from("sales_goals")
      .delete()
      .eq("user_id", targetUserId)
      .eq("period", period);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  const { error } = await supabaseAdmin
    .from("sales_goals")
    .upsert(
      { user_id: targetUserId, period, target_amount: targetAmount, set_by: user.id },
      { onConflict: "user_id,period" }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
