/**
 * Nirvana Product Sync — standalone terminal script
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/sync.ts sync     <Site>
 *   npx tsx --env-file=.env.local scripts/sync.ts discover <Site>
 *   npx tsx --env-file=.env.local scripts/sync.ts download <Site>
 *
 * sync      — RECOMMENDED. Full cycle per product type:
 *             discover zones → download Excel → parse → save to DB.
 *             Completes one product type fully before moving to the next.
 *             Safe to re-run — skips combos already saved successfully.
 *
 * discover  — Discovery only (no downloads). Maps all zones/sections and
 *             saves them to product_sync_discovery. For web UI selection flow.
 *
 * download  — Downloads rows marked selected_for_download=true in the DB.
 *             Used after running discover and selecting rows in the web UI.
 *
 * Examples:
 *   npx tsx --env-file=.env.local scripts/sync.ts sync Semenyih
 *   npx tsx --env-file=.env.local scripts/sync.ts sync Klang
 */

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import {
  loginToPortal,
  discoverSite,
  downloadOneFile,
  discoverProductType,
  getProductTypes,
  restartWizardToProductTypeStep,
  openNewReservationWizard,
  openDropdown,
  selectOption,
  clickNext,
  readDropdownOptions,
} from "../lib/product-sync/scraper";
import { parseAvailabilityExcel } from "../lib/product-sync/excel-parser";

// ── Supabase client ───────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// ── Portal name normalisation ─────────────────────────────────────────────────
// Some products appear under a different name in the Nirvana portal than the
// name used in this system. Map portal names → system names here.

const ZONE_NAME_MAP: Record<string, string> = {
  "Eternal Blessing Light": "EBL",
};

// Portal product type names that should be normalised to system names
const PRODUCT_TYPE_MAP: Record<string, string> = {
  "ETERNAL BL": "EBL",
};

function normaliseZone(zone: string): string {
  return ZONE_NAME_MAP[zone] ?? zone;
}

function normaliseProductType(pt: string): string {
  return PRODUCT_TYPE_MAP[pt] ?? pt;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function usage() {
  console.log(`
Usage:
  npx tsx --env-file=.env.local scripts/sync.ts sync     <Site>
  npx tsx --env-file=.env.local scripts/sync.ts discover <Site>
  npx tsx --env-file=.env.local scripts/sync.ts download <Site>
`);
  process.exit(1);
}

async function launchBrowser() {
  const isCI = process.env.CI === "true";
  return chromium.launch({
    executablePath:
      process.env.CHROME_EXECUTABLE_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: isCI,
    args: isCI
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
      : [],
  });
}

async function saveAndParse(
  site: string,
  rawProductType: string,
  rawZone: string,
  section: string | null,
  buffer: Buffer
): Promise<{ total: number; available: number }> {
  const productType = normaliseProductType(rawProductType);
  if (productType !== rawProductType) log(`  Product type normalised: "${rawProductType}" → "${productType}"`);
  const zone = normaliseZone(rawZone);
  if (zone !== rawZone) log(`  Zone normalised: "${rawZone}" → "${zone}"`);
  log(`  Parsing Excel (${buffer.length} bytes)…`);

  let lots: { lotCode: string; available: boolean }[];
  try {
    lots = await parseAvailabilityExcel(buffer);
  } catch (parseErr) {
    log(`  Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    return { total: 0, available: 0 };
  }

  log(`  Parsed ${lots.length} lot codes`);
  if (lots.length === 0) {
    log(`  WARNING: 0 lots parsed — Excel may be empty or in an unexpected format`);
    return { total: 0, available: 0 };
  }

  const available = lots.filter(l => l.available).length;
  log(`  ${available} available, ${lots.length - available} sold/reserved`);

  const now = new Date().toISOString();

  // Upsert summary counts at zone level
  const { error: summaryErr } = await supabase
    .from("product_availability_summary")
    .upsert(
      { site, product_type: productType, zone, total_lots: lots.length, available_lots: available, synced_at: now },
      { onConflict: "site,product_type,zone" }
    );
  if (summaryErr) log(`  Summary upsert warning: ${summaryErr.message}`);

  // If section is a comma-separated list (e.g. "DA,DB,DJ"), derive the real section
  // for each lot from its lot_code prefix (e.g. "DJ-01-18" → "DJ").
  // This happens when the portal groups multiple sections into one download.
  const multiSection = section && section.includes(",");

  // Delete existing rows for this combo
  const delQ = supabase.from("product_availability").delete()
    .eq("site", site).eq("product_type", productType).eq("zone", zone);
  if (multiSection) {
    // Delete all sections that belong to this zone download
    const secs = section!.split(",").map(s => s.trim());
    await delQ.in("section", secs);
  } else if (section) {
    await delQ.eq("section", section);
  } else {
    await delQ.is("section", null);
  }

  const availableLots = lots.filter(l => l.available);
  if (availableLots.length > 0) {
    const rows = availableLots.map(lot => ({
      site,
      product_type: productType,
      zone,
      // Derive section from lot code prefix when section is a multi-value list
      section: multiSection
        ? (lot.lotCode.includes("-") ? lot.lotCode.split("-")[0] : section)
        : (section ?? null),
      lot_code: lot.lotCode,
      available: true,
      synced_at: now,
    }));

    const { error } = await supabase.from("product_availability").insert(rows);
    if (error) {
      log(`  DB upsert error: ${error.message} (code: ${error.code})`);
    } else {
      log(`  Saved ${rows.length} available lots (${lots.length - available} sold omitted)`);
    }
  } else {
    log(`  No available lots — product_availability not updated`);
  }

  // Mark as downloaded in discovery table
  const { error: discErr } = await supabase
    .from("product_sync_discovery")
    .update({ download_status: "success", downloaded_at: new Date().toISOString(), products_found: lots.length })
    .eq("site", site)
    .eq("product_type", productType)
    .eq("zone", zone)
    .eq("section", section ?? null);

  if (discErr) log(`  Discovery update error: ${discErr.message}`);

  return { total: lots.length, available };
}

// ── Command: sync (discovery only — no Excel downloads) ──────────────────────

async function runSync(site: string) {
  log(`=== SYNC DISCOVERY: ${site} ===`);
  log(`No Excel files are downloaded. Use the Product Sync page to download at your own pace.`);
  log(`Safe to re-run — already discovered zones are skipped.`);

  // First: get the product type list — retry indefinitely until successful
  let productTypes: string[] = [];
  let initAttempt = 0;
  while (productTypes.length === 0) {
    initAttempt++;
    const browser = await launchBrowser();
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    try {
      log(`Logging in to get product type list (attempt ${initAttempt})…`);
      await loginToPortal(page);
      await restartWizardToProductTypeStep(page, site, log);
      productTypes = await getProductTypes(page);
      log(`Product types for ${site}: ${productTypes.join(", ")}`);
      await browser.close().catch(() => {});
    } catch (err) {
      await browser.close().catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      log(`Failed to get product types (attempt ${initAttempt}): ${msg} — retrying in 10s…`);
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  let totalNew = 0;

  // Each product type gets its own fresh browser session — no session degradation
  for (const productType of productTypes) {
    log(`\n=== [${productType}] Discovering… ===`);

    // Load already-discovered zones — skip them
    const { data: existing } = await supabase
      .from("product_sync_discovery")
      .select("zone")
      .eq("site", site)
      .eq("product_type", productType);

    const doneZones = new Set((existing ?? []).map(r => r.zone));
    if (doneZones.size > 0) {
      log(`[${productType}] ${doneZones.size} zone(s) already in DB — skipping those`);
    }

    // Save each zone to DB immediately as it's discovered
    const onCombo = async (combo: { zone: string; section: string | null }) => {
      // Keep portal names in discovery table — scraper uses them for navigation.
      // Normalisation happens only when writing to product_availability (in saveAndParse).
      const { error } = await supabase
        .from("product_sync_discovery")
        .upsert({
          site,
          product_type: productType,
          zone: combo.zone,
          section: combo.section ?? null,
          discovered_at: new Date().toISOString(),
          selected_for_download: false,
          download_status: "pending",
        }, { onConflict: "site,product_type,zone,section" });
      if (error) log(`[${productType}] DB save error for ${combo.zone}: ${error.message}`);
      else { log(`[${productType}] ✔ Saved ${combo.zone}${combo.section ? `/${combo.section}` : ""}`); totalNew++; }
    };

    // Retry indefinitely — fresh browser each time — until discovery succeeds
    let attempt = 0;
    while (true) {
      attempt++;
      const browser = await launchBrowser();
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      try {
        log(`[${productType}] Attempt ${attempt} — fresh browser, logging in…`);
        await loginToPortal(page);
        log(`[${productType}] Login successful`);

        // Refresh doneZones — previous attempts may have saved some zones
        const { data: saved } = await supabase
          .from("product_sync_discovery")
          .select("zone")
          .eq("site", site)
          .eq("product_type", productType);
        (saved ?? []).forEach(r => doneZones.add(r.zone));
        if (doneZones.size > 0) log(`[${productType}] Resuming — ${doneZones.size} zone(s) already saved`);

        await restartWizardToProductTypeStep(page, site, log);
        await discoverProductType(page, site, productType, log, onCombo, doneZones);
        await browser.close().catch(() => {});
        break; // success — move to next product type
      } catch (err) {
        await browser.close().catch(() => {});
        const msg = err instanceof Error ? err.message : String(err);
        log(`[${productType}] Attempt ${attempt} failed: ${msg}`);
        const waitSec = attempt <= 3 ? 10 : 30; // longer wait after repeated failures
        log(`[${productType}] Waiting ${waitSec}s before retry…`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      }
    }
  }

  log(`\n=== DISCOVERY COMPLETE for ${site} — ${totalNew} new combo(s) registered ===`);
  log(`Go to the Product Sync page to select which items to download.`);
}

// ── Command: discover ─────────────────────────────────────────────────────────

async function runDiscover(site: string) {
  log(`=== DISCOVER: ${site} ===`);

  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    log("Logging in…");
    await loginToPortal(page);
    log("Login successful");

    const combinations = await discoverSite(page, site, log);
    await browser.close();

    if (combinations.length === 0) {
      log("No combinations found — check the site name and try again.");
      process.exit(1);
    }

    const rows = combinations.map(c => ({
      site,
      product_type: c.productType,
      zone: c.zone,
      section: c.section ?? null,
      discovered_at: new Date().toISOString(),
      selected_for_download: false,
    }));

    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await supabase
        .from("product_sync_discovery")
        .upsert(rows.slice(i, i + BATCH), { onConflict: "site,product_type,zone,section" });
      if (error) log(`  DB error: ${error.message}`);
      else log(`  Saved ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
    }

    log(`Done — ${combinations.length} combinations saved.`);

  } catch (err) {
    await browser.close().catch(() => {});
    log(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// ── Command: download ─────────────────────────────────────────────────────────

async function runDownload(site: string, zone?: string, productType?: string) {
  log(`=== DOWNLOAD: ${site}${zone ? ` / ${zone}` : ""}${productType ? ` / ${productType}` : ""} ===`);

  let query = supabase
    .from("product_sync_discovery")
    .select("*")
    .eq("site", site)
    .order("product_type").order("zone");

  if (zone && productType) {
    // Specific zone + product type — download regardless of selected_for_download flag
    query = query.eq("zone", zone).eq("product_type", productType);
  } else {
    // No specific zone — fall back to selected_for_download list
    query = query.eq("selected_for_download", true).is("downloaded_at", null);
  }

  const { data: selected, error } = await query;

  if (error) { log(`DB error: ${error.message}`); process.exit(1); }
  if (!selected?.length) {
    log(`No combinations selected. Go to the Product Sync page and select rows first.`);
    process.exit(0);
  }

  log(`${selected.length} combinations to download.`);

  const browser = await launchBrowser();
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    log("Logging in…");
    await loginToPortal(page);
    log("Login successful");

    let done = 0;
    for (const combo of selected) {
      log(`[${done + 1}/${selected.length}] ${combo.product_type} / ${combo.zone} / ${combo.section ?? "—"}`);
      try {
        await restartWizardToProductTypeStep(page, site, log);
        const buf = await downloadOneFile(page, site, combo.product_type, combo.zone, combo.section ?? null, log);
        if (buf) {
          const { total, available } = await saveAndParse(site, combo.product_type, combo.zone, combo.section ?? null, buf);
          log(`  Saved — ${available}/${total} available`);
          done++;
        }
      } catch (err) {
        log(`  Error: ${err instanceof Error ? err.message : String(err)} — continuing`);
      }
    }

    await browser.close();
    log(`=== DONE — ${done}/${selected.length} downloaded ===`);

  } catch (err) {
    await browser.close().catch(() => {});
    log(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const [, , command, site, zone, productType] = process.argv;
if (!command || !site) usage();
if (!["sync", "discover", "download"].includes(command)) usage();

if (command === "sync") runSync(site);
else if (command === "discover") runDiscover(site);
else runDownload(site, zone, productType);
