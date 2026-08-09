import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";
import { loginToPortal, restartWizardToProductTypeStep, discoverProductType } from "@/lib/product-sync/scraper";

export const runtime = "nodejs";
export const maxDuration = 300;

type StreamEvent =
  | { type: "log"; message: string }
  | { type: "done"; status: "success"; saved: number }
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

  const { site, product_type, credential_id } = await request.json();
  if (!site || !product_type)
    return new Response(JSON.stringify({ error: "site and product_type are required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });

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

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try { controller.enqueue(sse(event, enc)); } catch { }
      };
      const log = (msg: string) => {
        console.log(`[discover-item][${site}/${product_type}] ${msg}`);
        send({ type: "log", message: `[${new Date().toISOString()}] ${msg}` });
      };

      const MAX_ATTEMPTS = 3;
      let lastErr = "";

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const { chromium: playwrightChromium } = await import("playwright-core");
        const executablePath = process.env.VERCEL
          ? await (await import("@sparticuz/chromium")).default.executablePath()
          : process.env.CHROME_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
        const launchArgs = process.env.VERCEL
          ? (await import("@sparticuz/chromium")).default.args
          : [];

        const browser = await playwrightChromium.launch({ executablePath, args: launchArgs, headless: false });
        const ctx = await browser.newContext({ acceptDownloads: false, viewport: { width: 1280, height: 900 } });
        const page = await ctx.newPage();

        try {
          log(`${attempt > 1 ? `Retry ${attempt}/${MAX_ATTEMPTS} — ` : ""}Logging in${credential ? ` as ${credential.username}` : ""}…`);
          await loginToPortal(page, credential);
          await restartWizardToProductTypeStep(page, site);
          log(`Discovering zones for ${product_type}…`);

          // Load already-discovered zones for this product_type so we can skip them
          const { data: existing } = await supabaseAdmin
            .from("product_sync_discovery")
            .select("zone")
            .eq("site", site)
            .eq("product_type", product_type);
          const doneZones = new Set<string>((existing ?? []).map((r: { zone: string }) => r.zone));
          if (doneZones.size > 0) log(`Skipping ${doneZones.size} already-discovered zone(s)`);

          let saved = 0;

          await discoverProductType(
            page,
            site,
            product_type,
            log,
            async ({ zone, section }) => {
              const { error } = await supabaseAdmin
                .from("product_sync_discovery")
                .upsert({
                  site,
                  product_type,
                  zone,
                  section: section ?? null,
                  discovered_at: new Date().toISOString(),
                  selected_for_download: false,
                }, { onConflict: "site,product_type,zone,section" });
              if (error) log(`✗ DB save error for ${zone}: ${error.message}`);
              else { log(`✔ Saved ${zone}${section ? `/${section}` : ""}`); saved++; }
            },
            doneZones
          );

          await browser.close();
          log(`Done — ${saved} new combo(s) saved.`);
          send({ type: "done", status: "success", saved });
          break;
        } catch (err) {
          lastErr = err instanceof Error ? err.message : String(err);
          log(`Attempt ${attempt} failed: ${lastErr}`);
          await browser.close().catch(() => {});
          if (attempt < MAX_ATTEMPTS) {
            log(`Waiting 15s before retry…`);
            await new Promise(r => setTimeout(r, 15000));
          } else {
            send({ type: "done", status: "failed", error: lastErr });
          }
        }
      }

      controller.close();
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
