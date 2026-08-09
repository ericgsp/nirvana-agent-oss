import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";
import { loginToPortal, downloadOneFile, restartWizardToProductTypeStep } from "@/lib/product-sync/scraper";
import { parseAvailabilityExcel, extractLayoutHtml } from "@/lib/product-sync/excel-parser";

export const runtime = "nodejs";
export const maxDuration = 300;

type StreamEvent =
  | { type: "log"; message: string }
  | { type: "done"; status: "success"; available: number; total: number }
  | { type: "done"; status: "failed"; error: string };

function sse(event: StreamEvent, enc: TextEncoder): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const { id, credential_id } = await request.json();
  if (!id)
    return new Response(JSON.stringify({ error: "id is required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });

  // Load credential — use specified one, or fall back to .env.local
  let credential: { username: string; password: string } | undefined;
  if (credential_id) {
    const { data: cred } = await supabaseAdmin
      .from("nirvana_credentials")
      .select("username, password")
      .eq("id", credential_id)
      .eq("active", true)
      .single();
    if (cred) credential = { username: cred.username, password: cred.password };
  }

  // Fetch the discovery row
  const { data: row, error: rowErr } = await supabaseAdmin
    .from("product_sync_discovery")
    .select("*")
    .eq("id", id)
    .single();

  if (rowErr || !row)
    return new Response(JSON.stringify({ error: "Discovery row not found" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });

  const signal = request.signal;
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try { controller.enqueue(sse(event, enc)); } catch { /* disconnected */ }
      };
      const log = (msg: string) => {
        console.log(`[download-item][${row.site}/${row.product_type}/${row.zone}] ${msg}`);
        send({ type: "log", message: `[${new Date().toISOString()}] ${msg}` });
      };

      // Mark as downloading
      await supabaseAdmin
        .from("product_sync_discovery")
        .update({ download_status: "downloading", download_error: null })
        .eq("id", id);

      try {
        // Clean up leftover Playwright temp files from previous runs
        if (process.env.VERCEL) {
          try {
            const { readdirSync, rmSync } = await import("fs");
            for (const entry of readdirSync("/tmp")) {
              if (entry.startsWith("playwright_") || entry.startsWith("chromium")) {
                rmSync(`/tmp/${entry}`, { recursive: true, force: true });
              }
            }
          } catch { /* best-effort */ }
        }

        const { chromium: playwrightChromium } = await import("playwright-core");
        const executablePath = process.env.VERCEL
          ? await (await import("@sparticuz/chromium")).default.executablePath()
          : process.env.CHROME_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
        const launchArgs = process.env.VERCEL
          ? [
              ...(await import("@sparticuz/chromium")).default.args,
              "--disable-dev-shm-usage",
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-gpu",
              "--disable-extensions",
              "--disable-background-networking",
              "--disable-default-apps",
            ]
          : [];

        const launchBrowser = async () => {
          const b = await playwrightChromium.launch({ executablePath, args: launchArgs, headless: false });
          const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
          const p = await ctx.newPage();
          return { browser: b, page: p };
        };

        // Outer loop: full fresh-browser restarts (login again from scratch).
        let buf: Buffer | null = null;
        let lastErr = "";

        {
        // ── Automated mode ─────────────────────────────────────────────────────
        // Inner session retries (back-button navigation, no logout) are handled
        // inside downloadOneFile — this outer loop only fires when the portal is
        // truly broken or all inner retries are exhausted.
        const MAX_ATTEMPTS = 2;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          if (signal.aborted) break;
          const { browser, page } = await launchBrowser();
          try {
            log(`${attempt > 1 ? `Fresh browser restart ${attempt}/${MAX_ATTEMPTS} — ` : ""}Logging in${credential ? ` as ${credential.username}` : ""}…`);
            await loginToPortal(page, credential);
            log("Login successful");
            await restartWizardToProductTypeStep(page, row.site);
            log(`Starting download: ${row.product_type} / ${row.zone}${row.section ? ` / ${row.section}` : ""}`);
            buf = await downloadOneFile(page, row.site, row.product_type, row.zone, row.section ?? null, log, signal);
            await browser.close();

            if (signal.aborted) break;

            if (buf) {
              const testLayout = extractLayoutHtml(buf);
              if (!testLayout) {
                const msg = `Downloaded file is binary Excel — layout HTML could not be extracted.`;
                log(msg);
                if (attempt < MAX_ATTEMPTS) {
                  log(`Waiting 30s before fresh browser restart…`);
                  await new Promise(r => setTimeout(r, 30000));
                  continue;
                }
                throw new Error(`All ${MAX_ATTEMPTS} browser sessions failed (file never returned as HTML).`);
              }
              log(`Layout HTML confirmed (${testLayout.length} chars) — proceeding.`);
            }

            break; // success
          } catch (err) {
            lastErr = err instanceof Error ? err.message : String(err);
            await browser.close().catch(() => {});
            if (lastErr === "ABORTED" || signal.aborted) break;
            if (lastErr === "PORTAL_BLOCKED_MANUAL") {
              log("Portal blocked — user dismissed dialog. Resetting item to pending.");
              await supabaseAdmin
                .from("product_sync_discovery")
                .update({ download_status: null, download_error: null })
                .eq("id", id);
              controller.close();
              return;
            }
            log(`Browser session ${attempt} failed: ${lastErr}`);
            if (attempt < MAX_ATTEMPTS) {
              const isPortalBroken = lastErr.includes("PORTAL_BROKEN");
              const waitMs = isPortalBroken ? 60000 : 30000;
              log(`Waiting ${waitMs / 1000}s before fresh browser restart…`);
              await new Promise(r => setTimeout(r, waitMs));
            } else {
              throw new Error(`All ${MAX_ATTEMPTS} browser sessions failed. Last error: ${lastErr}`);
            }
          }
        }
        } // end automated mode

        // Client disconnected — kill browser, reset DB status so row shows as pending again
        if (signal.aborted) {
          log("Stop requested — resetting status to pending.");
          await supabaseAdmin
            .from("product_sync_discovery")
            .update({ download_status: null, download_error: null })
            .eq("id", id);
          controller.close();
          return;
        }

        if (!buf) throw new Error("No file returned from portal");

        log("Parsing Excel file…");
        const lots = await parseAvailabilityExcel(buf);
        const available = lots.filter(l => l.available).length;
        log(`Found ${lots.length} lots — ${available} available, ${lots.length - available} sold`);

        // Normalise portal product type / zone names to system names
        const PRODUCT_TYPE_MAP: Record<string, string> = { "ETERNAL BL": "EBL" };
        const ZONE_NAME_MAP:    Record<string, string> = { "Eternal Blessing Light": "EBL" };
        const normProductType = PRODUCT_TYPE_MAP[row.product_type as string] ?? (row.product_type as string);
        const normZone        = ZONE_NAME_MAP[row.zone as string]        ?? (row.zone as string);

        // Resolve split site code for Semenyih — portal returns "Semenyih" but we store as NMG/NMP.
        // Default is NMG unless the price list explicitly says NMP.
        let siteCode = row.site as string;
        if (siteCode === "Semenyih") {
          const { data: priceRow } = await supabaseAdmin
            .from("product_price_list")
            .select("site_code")
            .in("product_name", [normZone, row.zone as string])
            .in("site_code", ["Semenyih-NMG", "Semenyih-NMP"])
            .eq("active", true)
            .limit(1)
            .single();
          if (priceRow?.site_code) {
            siteCode = priceRow.site_code;
            log(`Semenyih product resolved to ${siteCode}`);
          } else {
            // Default to NMG — all Semenyih portal downloads are NMG unless told otherwise
            siteCode = "Semenyih-NMG";
            log(`Semenyih split not found in price list for ${normZone} — defaulting to Semenyih-NMG`);
          }
        }

        if (lots.length > 0) {
          const now = new Date().toISOString();

          // Upsert summary counts (total + available) at zone level
          const { error: summaryErr } = await supabaseAdmin
            .from("product_availability_summary")
            .upsert(
              {
                site: siteCode,
                product_type: normProductType,
                zone: normZone,
                total_lots: lots.length,
                available_lots: available,
                synced_at: now,
              },
              { onConflict: "site,product_type,zone" }
            );
          if (summaryErr) log(`Summary upsert warning: ${summaryErr.message}`);

          // Delete existing records for this combo then insert only available lots
          const deleteQuery = supabaseAdmin
            .from("product_availability")
            .delete()
            .eq("site", siteCode)
            .eq("product_type", normProductType)
            .eq("zone", normZone);

          if (row.section) {
            await deleteQuery.eq("section", row.section);
          } else {
            await deleteQuery.is("section", null);
          }

          const availableLots = lots.filter(l => l.available);
          if (availableLots.length > 0) {
            const insertRows = availableLots.map(lot => ({
              site: siteCode,
              product_type: normProductType,
              zone: normZone,
              section: row.section ?? null,
              lot_code: lot.lotCode,
              available: true,
              synced_at: now,
            }));

            const { error: insertErr } = await supabaseAdmin
              .from("product_availability")
              .insert(insertRows);

            if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);
          }
          log(`Saved ${availableLots.length} available lots (${lots.length - available} sold omitted)`);
        }

        // Save annotated layout HTML snapshot.
        // If the discovery row has a section label (e.g. "A", "F"), save as
        // "ZONE-SECTION" (e.g. "EBL-F") so each section has its own row and
        // the agent app can render a per-section tab selector.
        const layoutHtml = extractLayoutHtml(buf!);
        if (layoutHtml) {
          const layoutZone = row.section ? `${normZone}-${row.section}` : normZone;
          // Always replace — re-downloading should give a fresh layout, never accumulate.
          const { error: layoutErr } = await supabaseAdmin
            .from("zone_layouts")
            .upsert(
              { site_code: siteCode, zone: layoutZone, layout_html: layoutHtml, synced_at: new Date().toISOString() },
              { onConflict: "site_code,zone" }
            );
          if (layoutErr) log(`Layout snapshot error: ${layoutErr.message}`);
          else log(`Layout snapshot saved for ${layoutZone}`);

          // When saving a sectioned layout (e.g. "D5-S11-DA,SA,..."), delete any old
          // unsectioned entry for the same zone so it doesn't block prefix matching.
          if (row.section && layoutZone !== normZone) {
            await supabaseAdmin
              .from("zone_layouts")
              .delete()
              .eq("site_code", siteCode)
              .eq("zone", normZone);
          }

          // When saving an unsectioned layout (fresh full download), delete any old
          // sectioned variants (zone LIKE 'ZONE-%') left over from a previous sectioned sync.
          if (!row.section) {
            const { data: stale } = await supabaseAdmin
              .from("zone_layouts")
              .select("zone")
              .eq("site_code", siteCode)
              .like("zone", `${normZone}-%`);
            if (stale?.length) {
              await supabaseAdmin
                .from("zone_layouts")
                .delete()
                .eq("site_code", siteCode)
                .in("zone", stale.map((r: any) => r.zone));
              log(`Deleted ${stale.length} stale sectioned layout(s) for ${normZone}`);
            }
          }
        }

        // Mark success
        await supabaseAdmin
          .from("product_sync_discovery")
          .update({
            download_status: "success",
            downloaded_at: new Date().toISOString(),
            products_found: lots.length,
            products_available: available,
            download_error: null,
          })
          .eq("id", id);

        send({ type: "done", status: "success", available, total: lots.length });

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`Error: ${message}`);

        await supabaseAdmin
          .from("product_sync_discovery")
          .update({ download_status: "failed", download_error: message })
          .eq("id", id);

        send({ type: "done", status: "failed", error: message });
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
