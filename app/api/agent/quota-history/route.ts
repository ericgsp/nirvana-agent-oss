import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

// Monthly quota actuals for a year-pair (baseYear and baseYear-1), for the
// year-over-year line chart. Lazy-fetched per year-pair button tap, not
// bundled into me-snapshot -- only one pair is ever shown at a time.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const baseYearParam = req.nextUrl.searchParams.get("baseYear");
  const baseYear = baseYearParam ? parseInt(baseYearParam, 10) : new Date().getFullYear();
  if (!Number.isFinite(baseYear)) {
    return Response.json({ error: "Invalid baseYear" }, { status: 400 });
  }
  const priorYear = baseYear - 1;

  const { data: rows } = await supabaseAdmin
    .from("sales_log")
    .select("quota_amount, sold_at")
    .eq("user_id", user.id)
    .gte("sold_at", `${priorYear}-01-01`)
    .lte("sold_at", `${baseYear}-12-31`);

  function monthsFor(year: number) {
    const totals = new Array(12).fill(0);
    (rows ?? []).forEach((r) => {
      const soldAt = r.sold_at as string;
      if (!soldAt.startsWith(String(year))) return;
      const monthIdx = parseInt(soldAt.slice(5, 7), 10) - 1;
      totals[monthIdx] += Number(r.quota_amount || 0);
    });
    return totals;
  }

  return Response.json({
    pairs: [
      { year: baseYear, months: monthsFor(baseYear) },
      { year: priorYear, months: monthsFor(priorYear) },
    ],
  });
}
