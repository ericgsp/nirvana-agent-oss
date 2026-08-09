import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const site = request.nextUrl.searchParams.get("site") ?? "Nirvana Life Planning";

  const { data, error } = await supabaseAdmin
    .from("product_price_list")
    .select("section_group, as_need_price, pre_need_price, product_category")
    .eq("site_code", site)
    .eq("product_name", "NLP")
    .is("size_description", null)
    .eq("active", true)
    .order("pre_need_price", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [] });
}
