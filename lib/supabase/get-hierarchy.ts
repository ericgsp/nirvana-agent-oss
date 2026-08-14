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

// My direct downline only -- never the tier above, never a peer's team, and
// this applies to every MLM tier including CBDD (the top tier is not
// special-cased to see the whole org). Only the "admin" app role -- a
// separate concept from MLM tier -- sees everyone.
export async function getMyDirectDownline(): Promise<AgentProfile[]> {
  const me = await getMyProfile();
  if (!me) return [];

  const role = await getUserRole();
  const seesEverything = role === "admin";

  const query = supabaseAdmin
    .from("agent_profiles")
    .select("user_id, tier, leader_id, agent_code, display_name");

  const { data } = seesEverything
    ? await query.neq("user_id", me.user_id)
    : await query.eq("leader_id", me.user_id);

  return (data as AgentProfile[]) ?? [];
}
