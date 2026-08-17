import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

// GET — the 50 most recent company-wide activity events, plus how many are
// unread since this user last opened the feed.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: readRow } = await supabaseAdmin
    .from("activity_reads")
    .select("last_seen_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const lastSeenAt = readRow?.last_seen_at ?? null;

  const { data: events } = await supabaseAdmin
    .from("activity_events")
    .select("id, event_type, user_id, display_name, site, product, section, amount, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const unreadCount = lastSeenAt
    ? (events ?? []).filter((e) => e.created_at > lastSeenAt).length
    : (events ?? []).length;

  return Response.json({ events: events ?? [], unreadCount });
}

// POST — mark the feed as read up to now (called when the agent opens it).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  await req.json().catch(() => null);
  await supabaseAdmin
    .from("activity_reads")
    .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" });

  return Response.json({ ok: true });
}
