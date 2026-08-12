import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { cookies } from "next/headers";
import { corsJson, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";

// Route Handler equivalent of the old logoutAction Server Action -- see
// app/api/auth/login/route.ts for why this moved off Server Actions.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Clear the active session record on logout
  if (user) {
    await supabaseAdmin.from("active_sessions").delete().eq("user_id", user.id);
  }

  const cookieStore = await cookies();
  cookieStore.delete("agent_device_token");

  await supabase.auth.signOut();

  return corsJson(req, { ok: true });
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
