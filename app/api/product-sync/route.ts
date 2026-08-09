import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";
import { loginToPortal, downloadFilesForSite } from "@/lib/product-sync/scraper";
import { parseAvailabilityExcel, extractLayoutHtml } from "@/lib/product-sync/excel-parser";

export const runtime = "nodejs";
export const maxDuration = 300;

type StreamEvent =
  | { type: "log"; message: string }
  | { type: "result"; filesDownloaded: number; productsUpserted: number; jobId: string }
  | { type: "error"; message: string; jobId?: string };

function sseLine(event: StreamEvent, encoder: TextEncoder): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(request: NextRequest) {
  // Auth check (must be done before starting the stream)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const site: string = body?.site;
  if (!site || typeof site !== "string") {
    return new Response(JSON.stringify({ error: "site is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(sseLine(event, encoder));
        } catch {
          // client disconnected
        }
      };

      const log = (msg: string) => {
        const message = `[${new Date().toISOString()}] ${msg}`;
        console.log(`[product-sync][${site}] ${msg}`);
        send({ type: "log", message });
      };

      // Create job record
      const { data: job, error: jobErr } = await supabaseAdmin
        .from("product_sync_jobs")
        .insert({ site, triggered_by: user.id, status: "running" })
        .select("job_id")
        .single();

      if (jobErr || !job) {
        send({
          type: "error",
          message: `Failed to create sync job: ${jobErr?.message ?? "no data returned"}`,
        });
        controller.close();
        return;
      }

      const jobId: string = job.job_id;

      try {
        const { chromium: playwrightChromium } = await import("playwright-core");

        let executablePath: string;
        let launchArgs: string[] = [];

        if (process.env.VERCEL) {
          const chromium = (await import("@sparticuz/chromium")).default;
          executablePath = await chromium.executablePath();
          launchArgs = chromium.args;
        } else {
          executablePath =
            process.env.CHROME_EXECUTABLE_PATH ||
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
        }

        const browser = await playwrightChromium.launch({
          executablePath,
          args: launchArgs,
          headless: true,
        });

        const context = await browser.newContext({
          acceptDownloads: true,
          viewport: { width: 1280, height: 900 },
        });
        const page = await context.newPage();

        log("Logging in to portal…");
        await loginToPortal(page);
        log("Login successful");

        // Load already-discovered zones so we can skip them on re-run
        const { data: existingRows } = await supabaseAdmin
          .from("product_sync_discovery")
          .select("zone")
          .eq("site", site);
        const doneZones = new Set<string>((existingRows ?? []).map((r: any) => r.zone as string));
        if (doneZones.size > 0) log(`Resuming — ${doneZones.size} zone(s) already in DB, will skip`);

        // Save each discovered combo to DB immediately ("discover one, save one")
        const onCombo = async (combo: { productType: string; zone: string; section: string | null }) => {
          const { error } = await supabaseAdmin
            .from("product_sync_discovery")
            .upsert({
              site,
              product_type: combo.productType,
              zone: combo.zone,
              section: combo.section ?? null,
              discovered_at: new Date().toISOString(),
              selected_for_download: false,
            }, { onConflict: "site,product_type,zone,section" });
          if (error) log(`  ✗ DB save error for ${combo.zone}: ${error.message}`);
          else log(`  ✔ Saved ${combo.zone}${combo.section ? `/${combo.section}` : ""}`);
        };

        log(`Starting discovery for site: ${site}`);
        const files = await downloadFilesForSite(page, site, log, onCombo, doneZones);
        log(`Discovery complete — ${files.length} file(s)`);

        await browser.close();

        // Parse and upsert availability
        let totalUpserted = 0;
        for (const file of files) {
          log(`Parsing ${file.productType} / ${file.zone} / ${file.section ?? "—"}`);
          const lots = await parseAvailabilityExcel(file.buffer);
          log(`  Found ${lots.length} product codes`);

          if (lots.length === 0) continue;

          const rows = lots.map((lot) => ({
            site: file.site,
            product_type: file.productType,
            zone: file.zone,
            section: file.section,
            lot_code: lot.lotCode,
            available: lot.available,
            synced_at: new Date().toISOString(),
          }));

          const { error: upsertErr } = await supabaseAdmin
            .from("product_availability")
            .upsert(rows, { onConflict: "site,product_type,zone,section,lot_code" });

          if (upsertErr) {
            log(`  Upsert error: ${upsertErr.message}`);
          } else {
            totalUpserted += rows.length;
          }

          // Save annotated layout HTML snapshot for the agent app
          // Always replace — re-downloading should give a fresh layout, never accumulate.
          const layoutHtml = extractLayoutHtml(file.buffer);
          if (layoutHtml) {
            const { error: layoutErr } = await supabaseAdmin
              .from("zone_layouts")
              .upsert(
                { site_code: file.site, zone: file.zone, layout_html: layoutHtml, synced_at: new Date().toISOString() },
                { onConflict: "site_code,zone" }
              );
            if (layoutErr) {
              log(`  Layout snapshot error: ${layoutErr.message}`);
            } else {
              log(`  Layout snapshot saved for ${file.zone}`);
            }
          }
        }

        // Mark job complete
        await supabaseAdmin
          .from("product_sync_jobs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            files_downloaded: files.length,
            products_upserted: totalUpserted,
          })
          .eq("job_id", jobId);

        log(`Sync complete — ${files.length} files, ${totalUpserted} products updated`);
        send({ type: "result", filesDownloaded: files.length, productsUpserted: totalUpserted, jobId });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`Fatal error: ${message}`);

        await supabaseAdmin
          .from("product_sync_jobs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: message,
          })
          .eq("job_id", jobId);

        send({ type: "error", message, jobId });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  const { searchParams } = new URL(request.url);

  // ?stats=1  →  return product_availability counts grouped by site + product_type
  if (searchParams.get("stats") === "1") {
    // Use raw SQL aggregation to avoid Supabase's 1000-row fetch cap
    const { data, error } = await supabaseAdmin.rpc("get_product_availability_stats");

    if (error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });

    // Group: { [site]: { [productType]: { total, available } } }
    const grouped: Record<string, Record<string, { total: number; available: number }>> = {};
    for (const row of (data as { site: string; product_type: string; total: number; available: number }[]) ?? []) {
      if (!grouped[row.site]) grouped[row.site] = {};
      grouped[row.site][row.product_type] = { total: Number(row.total), available: Number(row.available) };
    }

    return new Response(JSON.stringify({ stats: grouped }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // default  →  return last 50 sync jobs
  const { data, error } = await supabaseAdmin
    .from("product_sync_jobs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

  return new Response(JSON.stringify({ jobs: data }), {
    headers: { "Content-Type": "application/json" },
  });
}
