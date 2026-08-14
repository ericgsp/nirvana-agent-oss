import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

// Cross-sell suggestions: for a lead who has closed at least one sale, find
// product categories still offered at the SAME site they bought from that
// they haven't bought yet -- e.g. bought a Columbarium niche -> suggest
// Burial Plot / Pedestal / NLP at that same site. Only sites/categories with
// known category data (captured on closed_items from this point forward)
// can be matched -- older closed sales without that data are skipped rather
// than guessed at.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const leadId = req.nextUrl.searchParams.get("leadId");
  if (!leadId) return Response.json({ error: "Missing leadId" }, { status: 400 });

  const { data: closedQuotes } = await supabaseAdmin
    .from("recent_quotes")
    .select("site, closed_items")
    .eq("lead_id", leadId)
    .eq("user_id", user.id)
    .eq("status", "closed");

  // Bought categories, grouped by site -- a lead may have bought at more
  // than one site, and cross-sell should stay scoped per site.
  const boughtBySite: Record<string, Set<string>> = {};
  (closedQuotes ?? []).forEach((q) => {
    const site = q.site as string;
    const items = Array.isArray(q.closed_items) ? q.closed_items : [];
    items.forEach((it: { category?: string }) => {
      if (!it.category) return;
      (boughtBySite[site] ??= new Set()).add(it.category);
    });
  });

  const sites = Object.keys(boughtBySite);
  if (!sites.length) {
    return Response.json({ suggestions: [], reason: "no_category_data" });
  }

  const { data: allProducts } = await supabaseAdmin
    .from("product_price_list")
    .select("site_code, product_category, product_name")
    .in("site_code", sites)
    .eq("active", true);

  // Distinct (site, category, product_name) not already bought at that site.
  const seen = new Set<string>();
  const suggestions: { site: string; category: string; product_name: string }[] = [];
  (allProducts ?? []).forEach((p) => {
    const site = p.site_code as string;
    const category = p.product_category as string;
    const name = p.product_name as string;
    if (boughtBySite[site]?.has(category)) return;
    const key = site + "|" + category + "|" + name;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ site, category, product_name: name });
  });

  return Response.json({ suggestions: suggestions.slice(0, 20) });
}
