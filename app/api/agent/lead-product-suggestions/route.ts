import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

// Fixed pre-need planning package rules, not a generic "different category"
// matcher -- these three products are the core of a complete pre-plan, and
// buying any one of them means the other two (plus the always-on add-ons)
// are still worth raising with the family. Real product_category values,
// confirmed directly against the DB (the "Niche" category, not "Columbarium"
// as an old SQL comment incorrectly suggested).
const CROSS_SELL_MAP: Record<string, string[]> = {
  "Burial Plot": ["NLP", "TOMB", "Pedestal", "EBL", "EC"],
  "Niche": ["NLP", "Pedestal", "EBL", "EC"],
  "NLP": ["Burial Plot", "Niche", "EBL", "EC"],
};

// TOMB isn't its own product_category -- it's an add-on cost field on a
// Burial Plot row, so there's no separate "did they buy a tomb" signal to
// check. EC (Enlightenment Ceremony) isn't in product_price_list at all --
// it's a yearly form-and-payment thing, not a quoted product. Both are
// still shown (the family still needs them) but can't be auto-ticked.
const UNTRACKABLE: Record<string, string> = {
  TOMB: "Not tracked separately from the Burial Plot sale — check with the family.",
  EC: "See Menu for EC form",
};

const CATEGORY_LABELS: Record<string, string> = {
  "Burial Plot": "Burial Plot",
  "Niche": "Niche",
  "NLP": "NLP",
  "Pedestal": "Pedestal",
  "EBL": "Yearly Blessing Light (EBL)",
  "TOMB": "Tomb",
  "EC": "Enlightenment Ceremony (EC)",
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const leadId = req.nextUrl.searchParams.get("leadId");
  if (!leadId) return Response.json({ error: "Missing leadId" }, { status: 400 });

  const { data: closedQuotes } = await supabaseAdmin
    .from("recent_quotes")
    .select("closed_items")
    .eq("lead_id", leadId)
    .eq("user_id", user.id)
    .eq("status", "closed");

  const boughtCategories = new Set<string>();
  (closedQuotes ?? []).forEach((q) => {
    const items = Array.isArray(q.closed_items) ? q.closed_items : [];
    items.forEach((it: { category?: string }) => {
      if (it.category) boughtCategories.add(it.category);
    });
  });

  if (!boughtCategories.size) {
    return Response.json({ checklist: [], reason: "no_category_data" });
  }

  const suggested = new Set<string>();
  boughtCategories.forEach((cat) => {
    (CROSS_SELL_MAP[cat] ?? []).forEach((s) => suggested.add(s));
  });

  const checklist = Array.from(suggested).map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    trackable: !UNTRACKABLE[cat],
    note: UNTRACKABLE[cat] ?? null,
    alreadySold: boughtCategories.has(cat),
  }));

  return Response.json({ checklist });
}
