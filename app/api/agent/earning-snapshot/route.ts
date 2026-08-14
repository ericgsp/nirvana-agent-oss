import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getMyProfile } from "@/lib/supabase/get-hierarchy";

export const runtime = "nodejs";

// Commission rate by tier -- flat % of net PV, not yet product-specific.
const TIER_RATE_PCT: Record<string, number> = {
  AGENT: 8,
  SD: 15,
  DSD: 20,
  BDD: 24,
  CBDD: 28,
};

type ClosedItem = {
  label?: string;
  amount?: number;
  pv?: number;
  trust?: number;
  backwall?: number;
  category?: string;
  discPct?: number;
  discRm?: number;
};

// Land (Burial Plot) and Niche (Columbarium) are the only two categories with
// a confirmed commission formula so far -- other categories show as pending
// rather than guessing at a formula that hasn't been given yet.
function computeItemCommission(item: ClosedItem, ratePct: number) {
  const cat = (item.category || "").toLowerCase();
  const pv = item.pv || 0;
  let netPv: number | null = null;

  if (cat === "burial plot") {
    netPv = pv - (item.trust || 0) - (item.backwall || 0);
  } else if (cat === "columbarium") {
    netPv = pv - (item.trust || 0);
  } else {
    return { netPv: null, commission: null, supported: false };
  }

  if (item.discRm) netPv -= item.discRm;
  else if (item.discPct) netPv -= netPv * (item.discPct / 100);

  const commission = netPv * (ratePct / 100);
  return { netPv, commission, supported: true };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ tier: null, ratePct: null, totalCommission: 0, totalPv: 0, closedSales: [] });
  }

  const [profile, { data: closedQuotes }] = await Promise.all([
    getMyProfile(),
    supabaseAdmin
      .from("recent_quotes")
      .select("id, site, product, customer_name, net_total, closed_items, created_at")
      .eq("user_id", user.id)
      .eq("status", "closed")
      .order("created_at", { ascending: false }),
  ]);

  const tier = profile?.tier || "AGENT";
  const ratePct = TIER_RATE_PCT[tier] ?? TIER_RATE_PCT.AGENT;

  let totalCommission = 0;
  let totalPv = 0;

  const closedSales = (closedQuotes ?? []).map((q) => {
    const items: ClosedItem[] = Array.isArray(q.closed_items) ? q.closed_items : [];
    const breakdown = items.map((it) => {
      const { netPv, commission, supported } = computeItemCommission(it, ratePct);
      if (supported && netPv != null && commission != null) {
        totalPv += netPv;
        totalCommission += commission;
      }
      return {
        label: it.label || "",
        amount: it.amount || 0,
        category: it.category || "",
        netPv,
        commission,
        supported,
      };
    });
    return {
      id: q.id,
      site: q.site,
      product: q.product,
      customer_name: q.customer_name,
      net_total: q.net_total,
      created_at: q.created_at,
      items: breakdown,
    };
  });

  return Response.json({
    tier,
    ratePct,
    totalCommission,
    totalPv,
    closedSales,
  });
}
