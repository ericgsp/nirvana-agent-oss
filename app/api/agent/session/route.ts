import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getUserRole } from "@/lib/supabase/get-role";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { corsJson, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";

// Same-origin-independent equivalent of the server-side check that used to
// run inline in app/agent/page.tsx before rendering -- the locally-bundled
// shell has no Node server on the phone to do that, so it calls this once
// on load instead and redirects client-side on a non-"valid" result. Logic
// is unchanged, just relocated. Also folds in the site-list fetch that used
// to happen alongside it server-side.
export async function GET(req: NextRequest) {
  const role = await getUserRole();
  if (!role) return corsJson(req, { valid: false, redirectReason: null });

  if (role === "agent") {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get("agent_device_token")?.value;
    if (!deviceToken) return corsJson(req, { valid: false, redirectReason: null });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return corsJson(req, { valid: false, redirectReason: null });

    const { data: activeSession } = await supabaseAdmin
      .from("active_sessions")
      .select("device_token")
      .eq("user_id", user.id)
      .single();

    if (!activeSession || activeSession.device_token !== deviceToken) {
      return corsJson(req, { valid: false, redirectReason: "session_replaced" });
    }
  }

  const { data } = await supabaseAdmin.rpc("get_distinct_site_codes");
  const sites = ((data ?? []) as string[]).sort();

  return corsJson(req, { valid: true, role, sites });
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
