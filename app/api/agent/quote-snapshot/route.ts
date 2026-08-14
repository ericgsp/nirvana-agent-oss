import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

// Lazy-loaded on "View Quote" tap only -- the snapshot HTML can be sizable,
// so it's kept out of the list fetches (me-snapshot/leads-snapshot) and
// only pulled when an agent actually wants to see a specific past quote.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("recent_quotes")
    .select("quote_snapshot_html")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return Response.json({ html: data?.quote_snapshot_html || null });
}
