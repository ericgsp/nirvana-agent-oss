import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p            = request.nextUrl.searchParams;
  const site         = p.get("site")    ?? "";
  const product_name = p.get("product") ?? "";

  if (!site || !product_name)
    return NextResponse.json({ error: "Missing site or product" }, { status: 400 });

  // Fetch both product-specific assets AND site-level assets (product_name = site)
  const productNames = [...new Set([product_name, site])];
  const { data, error } = await supabaseAdmin
    .from("product_assets")
    .select("id, asset_type, storage_path, youtube_url, caption, sort_order, file_size_kb")
    .eq("site_code", site)
    .in("product_name", productNames)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate signed URLs for photos and docs (valid 1 hour)
  const assets = await Promise.all((data ?? []).map(async (row: any) => {
    if (row.storage_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("product-assets")
        .createSignedUrl(row.storage_path, 3600);
      return { ...row, url: signed?.signedUrl ?? null };
    }
    return { ...row, url: row.youtube_url ?? null };
  }));

  return NextResponse.json({ assets });
}
