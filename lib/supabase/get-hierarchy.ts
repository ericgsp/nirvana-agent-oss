import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getUserRole } from "@/lib/supabase/get-role";

export type Tier = "CBDD" | "BDD" | "DSD" | "SD" | "AGENT";

export type AgentProfile = {
  user_id: string;
  tier: Tier;
  leader_id: string | null;
  agent_code: string | null;
  display_name: string | null;
};

// agent_profiles only grants to service_role (no RLS, matches this project's
// convention of enforcing access control in code) -- so this always reads
// via supabaseAdmin, using the cookie-scoped client only to identify "me".
export async function getMyProfile(): Promise<AgentProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdmin
    .from("agent_profiles")
    .select("user_id, tier, leader_id, agent_code, display_name")
    .eq("user_id", user.id)
    .single();

  return (data as AgentProfile) ?? null;
}

// The single, shared implementation of "who can this user see" -- every MLM
// tier (including CBDD, the top tier) sees its ENTIRE recursive downline,
// never the tier above, never a peer's team. Only the "admin" app role (a
// separate concept from MLM tier) sees everyone. This used to be
// reimplemented separately in team-snapshot and me-snapshot, which drifted
// out of sync (the me-snapshot copy kept the old "CBDD sees everything,
// direct reports only" bug after team-snapshot was fixed) -- now there's
// exactly one place this logic lives.
export async function getRecursiveDownline(userId: string): Promise<AgentProfile[]> {
  const role = await getUserRole();
  const seesEverything = role === "admin";

  const { data } = await supabaseAdmin
    .from("agent_profiles")
    .select("user_id, tier, leader_id, agent_code, display_name");
  const all = (data as AgentProfile[]) ?? [];

  if (seesEverything) return all.filter((p) => p.user_id !== userId);

  const childrenByLeader: Record<string, AgentProfile[]> = {};
  all.forEach((p) => {
    if (!p.leader_id) return;
    (childrenByLeader[p.leader_id] ??= []).push(p);
  });

  const result: AgentProfile[] = [];
  const visited = new Set<string>([userId]);
  const queue = [...(childrenByLeader[userId] ?? [])];
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current.user_id)) continue; // cycle safety net
    visited.add(current.user_id);
    result.push(current);
    queue.push(...(childrenByLeader[current.user_id] ?? []));
  }
  return result;
}
