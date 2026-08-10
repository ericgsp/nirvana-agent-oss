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
  const seesEverything = me?.tier === "CBDD" || role === "admin";

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

  return Response.json({
    access: true,
    scope: seesEverything ? "org" : "team",
    members,
  });
}
