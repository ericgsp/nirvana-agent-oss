import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

// GET — every closed sale for the logged-in agent, newest first. This is
// the one place an agent can see all their own sales in one list instead of
// having to open each lead individually to find out what they closed.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: salesRows } = await supabaseAdmin
    .from("sales_log")
    .select("id, quotation_ref, amount, quota_amount, sold_at")
    .eq("user_id", user.id)
    .order("sold_at", { ascending: false });

  const quoteIds = (salesRows ?? [])
    .map((r) => r.quotation_ref?.split("|").pop())
    .filter((id): id is string => !!id);

  const { data: quoteRows } = quoteIds.length
    ? await supabaseAdmin
        .from("recent_quotes")
        .select("id, customer_name, closed_items")
        .in("id", quoteIds)
    : { data: [] as { id: string; customer_name: string | null; closed_items: { isAsNeed?: boolean }[] | null }[] };

  const quoteById = new Map((quoteRows ?? []).map((q) => [q.id, q]));

  const rows = (salesRows ?? []).map((r) => {
    const parts = (r.quotation_ref || "").split("|");
    const [site, product, section] = parts;
    const quoteId = parts[parts.length - 1];
    const quote = quoteById.get(quoteId);
    const closedItems: { isAsNeed?: boolean }[] = quote?.closed_items ?? [];
    // Purchase type isn't stored on sales_log itself -- derive it from the
    // same closed_items snapshot that already drives the quota calc, so it
    // can never disagree with the amount/quota shown on the same row.
    const purchaseType = closedItems.length
      ? (closedItems.every((it) => it.isAsNeed) ? "As-Need" : "Pre-Need")
      : null;
    return {
      id: r.id,
      site: site || null,
      product: product || null,
      section: section || null,
      customerName: quote?.customer_name || null,
      purchaseType,
      amount: Number(r.amount || 0),
      quotaAmount: r.quota_amount != null ? Number(r.quota_amount) : null,
      soldAt: r.sold_at,
    };
  });

  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  const totalQuota = rows.reduce((sum, r) => sum + (r.quotaAmount || 0), 0);

  return Response.json({ rows, totalAmount, totalQuota });
}
