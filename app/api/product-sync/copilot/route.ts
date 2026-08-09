import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getCopilotStatus, captureLayoutExcel } from "@/lib/product-sync/copilot";
import { parseAvailabilityExcel, extractLayoutHtml } from "@/lib/product-sync/excel-parser";

export const runtime = "nodejs";
export const maxDuration = 120;

// GET ?action=status  — check Chrome connection + layout page detection
// GET ?action=history — last 100 saved zones
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = request.nextUrl.searchParams.get("action") ?? "status";

  if (action === "status") {
    const status = await getCopilotStatus();
    return NextResponse.json(status);
  }

  if (action === "history") {
    const { data } = await supabaseAdmin
      .from("product_sync_discovery")
      .select("site, product_type, zone, section, discovered_at")
      .eq("selected_for_download", true)
      .order("discovered_at", { ascending: false })
      .limit(100);
    return NextResponse.json({ history: data ?? [] });
  }

  if (action === "zones") {
    const site        = request.nextUrl.searchParams.get("site") ?? "";
    const productType = request.nextUrl.searchParams.get("productType") ?? "";
    if (!site || !productType) return NextResponse.json({ zones: [] });
    const { data } = await supabaseAdmin
      .from("product_sync_discovery")
      .select("zone")
      .eq("site", site)
      .eq("product_type", productType)
      .order("zone");
    const zones = [...new Set((data ?? []).map((r: { zone: string }) => r.zone))];
    return NextResponse.json({ zones });
  }

  if (action === "sections") {
    const site        = request.nextUrl.searchParams.get("site") ?? "";
    const productType = request.nextUrl.searchParams.get("productType") ?? "";
    const zone        = request.nextUrl.searchParams.get("zone") ?? "";
    if (!site || !productType || !zone) return NextResponse.json({ sections: [] });
    const { data } = await supabaseAdmin
      .from("product_sync_discovery")
      .select("section")
      .eq("site", site)
      .eq("product_type", productType)
      .eq("zone", zone)
      .not("section", "is", null)
      .order("section");
    const sections = [...new Set((data ?? []).map((r: { section: string }) => r.section))];
    return NextResponse.json({ sections });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST — trigger download for the current Chrome layout page and save to DB
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    site: string;
    productType: string;
    zone: string;
    section?: string;
  };
  const { site, productType, zone, section } = body;

  if (!site || !productType || !zone) {
    return NextResponse.json({ error: "site, productType, zone are required" }, { status: 400 });
  }

  const logs: string[] = [];
  const onLog = (msg: string) => {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(`[copilot] ${msg}`);
    logs.push(line);
  };

  try {
    onLog(`${site} / ${productType} / ${zone}${section ? ` / ${section}` : ""}`);

    const buffer = await captureLayoutExcel(onLog);
    const lots = await parseAvailabilityExcel(buffer);
    const availCount = lots.filter((l) => l.available).length;
    onLog(`Parsed: ${lots.length} lots, ${availCount} available`);

    if (lots.length === 0) {
      return NextResponse.json({ success: false, error: "No lot codes found in downloaded file", logs });
    }

    // Replace existing records for this zone — delete then insert
    // (avoids expression-index conflict issues with COALESCE(section,''))
    const deleteQuery = supabaseAdmin
      .from("product_availability")
      .delete()
      .eq("site", site)
      .eq("product_type", productType)
      .eq("zone", zone);
    if (section) {
      deleteQuery.eq("section", section);
    } else {
      deleteQuery.is("section", null);
    }
    const { error: delErr } = await deleteQuery;
    if (delErr) throw new Error(`DB delete failed: ${delErr.message}`);

    const rows = lots.map((lot) => ({
      site,
      product_type: productType,
      zone,
      section: section ?? null,
      lot_code: lot.lotCode,
      available: lot.available,
      synced_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await supabaseAdmin
      .rpc("insert_product_availability", { rows });
    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);
    onLog(`Saved ${rows.length} records`);

    // Save annotated layout HTML to zone_layouts
    const layoutHtml = extractLayoutHtml(buffer);
    if (layoutHtml) {
      const { data: existing } = await supabaseAdmin
        .from("zone_layouts")
        .select("layout_html")
        .eq("site_code", site)
        .eq("zone", zone)
        .single();

      const combined = section
        ? (existing?.layout_html ? existing.layout_html + "\n" + layoutHtml : layoutHtml)
        : layoutHtml;

      const { error: layoutErr } = await supabaseAdmin
        .from("zone_layouts")
        .upsert(
          { site_code: site, zone, layout_html: combined, synced_at: new Date().toISOString() },
          { onConflict: "site_code,zone" }
        );
      if (layoutErr) onLog(`Layout snapshot error: ${layoutErr.message}`);
      else onLog("Layout snapshot saved");
    }

    // Record in discovery table — delete then insert to avoid expression-index conflict
    const discDelete = supabaseAdmin
      .from("product_sync_discovery")
      .delete()
      .eq("site", site)
      .eq("product_type", productType)
      .eq("zone", zone);
    if (section) { discDelete.eq("section", section); }
    else          { discDelete.is("section", null); }
    await discDelete;

    await supabaseAdmin
      .from("product_sync_discovery")
      .insert({
        site,
        product_type: productType,
        zone,
        section: section ?? null,
        discovered_at: new Date().toISOString(),
        selected_for_download: true,
        download_status: "success",
        downloaded_at: new Date().toISOString(),
        products_found: lots.length,
        products_available: availCount,
      });

    return NextResponse.json({ success: true, lotsUpserted: rows.length, availCount, logs });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog(`Error: ${message}`);
    return NextResponse.json({ success: false, error: message, logs }, { status: 500 });
  }
}
