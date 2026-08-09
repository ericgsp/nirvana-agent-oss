import { createClient } from "@/lib/supabase/server";

export async function getUserRole(): Promise<"admin" | "agent" | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return (data?.role as "admin" | "agent") ?? null;
}
