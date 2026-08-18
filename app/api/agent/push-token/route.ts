import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

// POST — register (or refresh) this device's FCM token for the logged-in
// user. Called once on each app launch after the OS grants permission.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const token = body?.token;
  const platform = typeof body?.platform === "string" ? body.platform : "android";
  if (!token || typeof token !== "string") {
    return Response.json({ error: "token is required" }, { status: 400 });
  }

  // A token belongs to one device, but that device may have logged out and
  // back in as a different user -- upsert on the token itself so it always
  // points at whoever is currently signed in on that device.
  const { error } = await supabaseAdmin
    .from("push_tokens")
    .upsert(
      { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: "token" }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
