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

// Every tier sees its ENTIRE downline, not just direct reports -- a CBDD
// sees every BDD/DSD/SD/AGENT under it, a BDD sees every DSD/SD/AGENT under
// it, and so on down to SD seeing its AGENTs. This walks the whole
// agent_profiles tree from `userId` downward (BFS), so "my team" always
// means my full subtree, however many levels deep. Two people never share a
// subtree unless one's upline chain actually passes through the other, so
// this also naturally keeps separate CBDD groups from ever seeing each other.
async function getRecursiveDownline(userId: string): Promise<AgentProfile[]> {
  const { data } = await supabaseAdmin
    .from("agent_profiles")
    .select("user_id, tier, leader_id, agent_code, display_name");
  const all = (data as AgentProfile[]) ?? [];

  const childrenByLeader: Record<string, AgentProfile[]> = {};
  all.forEach((p) => {
    if (!p.leader_id) return;
    (childrenByLeader[p.leader_id] ??= []).push(p);
  });

  const result: AgentProfile[] = [];
  const visited = new Set<string>([userId]);
  const queue = [userId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const child of childrenByLeader[current] ?? []) {
      if (visited.has(child.user_id)) continue; // cycle safety net
      visited.add(child.user_id);
      result.push(child);
      queue.push(child.user_id);
    }
  }
  return result;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ access: false, scope: null, members: [] });
  }

  const me = await getMyProfile();
  const role = await getUserRole();
  // Only the "admin" role (a separate concept from MLM tier, for internal
  // support/management) sees the entire org regardless of tier or position.
  const seesEverything = role === "admin";

  if (!me && !seesEverything) {
    // No profile, not admin -- nothing to show, not an error.
    return Response.json({ access: false, scope: null, members: [] });
  }

  let downline: AgentProfile[];
  if (seesEverything) {
    const { data } = await supabaseAdmin
      .from("agent_profiles")
      .select("user_id, tier, leader_id, agent_code, display_name")
      .neq("user_id", user.id);
    downline = (data as AgentProfile[]) ?? [];
  } else {
    downline = await getRecursiveDownline(user.id);
  }

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
    self: me ? { display_name: me.display_name, agent_code: me.agent_code, tier: me.tier } : null,
  });
}

// POST — set a downline member's goal for the current period. Only the
// caller's own visible (recursive) downline can be targeted, same scoping
// as GET -- a BDD can set a goal for anyone under it, direct or not, but
// never for someone outside its own subtree.
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

  const role = await getUserRole();
  // Only the "admin" role sees/manages the entire org; everyone else can
  // only set goals within their own recursive downline (same scoping as GET).
  const seesEverything = role === "admin";

  if (!seesEverything) {
    const downline = await getRecursiveDownline(user.id);
    const allowed = downline.some((d) => d.user_id === targetUserId);
    if (!allowed) {
      return Response.json({ error: "You can only manage goals for your own team" }, { status: 403 });
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
