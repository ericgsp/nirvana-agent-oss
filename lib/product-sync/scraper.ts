import type { Page } from "playwright-core";
import type { DownloadedFile } from "./types";

const PORTAL_URL = process.env.NIRVANA_PORTAL_URL!;
const USERNAME = process.env.NIRVANA_PORTAL_USERNAME!;
const PASSWORD = process.env.NIRVANA_PORTAL_PASSWORD!;
const AGENT_CODE = process.env.NIRVANA_PORTAL_AGENT_CODE || USERNAME;

const SELECTOR_TIMEOUT = 180000;  // 3 min for normal elements
const DOWNLOAD_TIMEOUT = 180000;  // 3 min for layout page to render
const NAV_TIMEOUT = 180000;       // 3 min for page navigation
const SECTION_TIMEOUT = 60000;    // 1 min for section dropdown — portal is slow

/**
 * Wait until SAP Fiori signals it is fully idle before the next interaction.
 *
 * Checks in order:
 *   1. Network idle — all XHR/fetch requests have settled
 *   2. Block layer gone — #sap-ui-blocklayer-popup is hidden/removed
 *   3. Busy indicators gone — no visible .sapUiLocalBusyIndicator or .sapUiBusy elements
 *   4. 600ms buffer — SAP may still be re-rendering after indicators clear
 *
 * Replaces all fixed sapWait(3000ms) calls with a reactive check so the
 * scraper moves as fast as the portal allows and never clicks into a busy state.
 */
// waitForSapReady: call with navTransition=true after page navigation (Next button,
// tile clicks) so SAP has time to start its loading indicator before we check for it.
// For within-page operations (dropdown selections) use navTransition=false (default).
async function waitForSapReady(page: Page, networkIdleTimeout = 15000, navTransition = false) {
  // 1. Wait for network to settle (short timeout — SAP often has long-polling
  //    connections that never fully idle, so don't block forever on this)
  await page.waitForLoadState("networkidle", { timeout: networkIdleTimeout }).catch(() => {});

  // 1b. For page transitions only: give SAP time to START showing a busy indicator.
  //     SAP often delays the loading spinner by ~500ms after a navigation click.
  //     Without this pause we see "no busy indicator" in the gap and return too early.
  if (navTransition) await page.waitForTimeout(2000);

  // 2 & 3. Poll until block layer is gone AND no busy indicators are visible
  await page.waitForFunction(() => {
    // Block layer check
    const block = document.getElementById("sap-ui-blocklayer-popup");
    if (block) {
      const s = window.getComputedStyle(block);
      const rect = block.getBoundingClientRect();
      const visible = rect.height > 0 && s.display !== "none" && s.visibility !== "hidden"
        && s.pointerEvents !== "none" && parseFloat(s.opacity) > 0;
      if (visible) return false;
    }

    // Busy indicator check — any visible local busy spinner means SAP is still working
    const busyEls = document.querySelectorAll(
      ".sapUiLocalBusyIndicator, .sapUiBusy, [class*='sapUiBlockLayer']"
    );
    for (const el of Array.from(busyEls)) {
      const s = window.getComputedStyle(el as HTMLElement);
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.height > 0 && s.display !== "none" && s.visibility !== "hidden"
          && parseFloat(s.opacity) > 0) {
        return false;
      }
    }

    return true;
  }, { timeout: 60000, polling: 300 }).catch(() => {});

  // 4. Buffer after indicators clear — SAP re-renders DOM after unblocking.
  // Keep wiggling so SAP sees continuous human presence during the buffer.
  await wiggleMouse(page, 1500);
}

// Keep waitForSapUnblock as an alias so existing call-sites still compile
const waitForSapUnblock = waitForSapReady;

// sapWait alias — used at call sites that previously used a fixed 3s pause
const sapWait = waitForSapReady;

// Random human-like pause before each portal interaction.
// Mimics the natural delay between a person seeing the page and clicking.
async function humanPause(page: Page, minMs = 1500, maxMs = 3500) {
  const delay = Math.floor(minMs + Math.random() * (maxMs - minMs));
  await wiggleMouse(page, delay);
}

// Continuously move the mouse in small random steps for the given duration.
// SAP portals check for mouse activity; without it they may block actions or hide buttons.
async function wiggleMouse(page: Page, durationMs = 0) {
  const vp = page.viewportSize() ?? { width: 1280, height: 900 };
  const move = async () => {
    const x = Math.floor(vp.width * 0.3 + Math.random() * vp.width * 0.4);
    const y = Math.floor(vp.height * 0.3 + Math.random() * vp.height * 0.4);
    await page.mouse.move(x, y, { steps: 8 }).catch(() => {});
  };
  if (durationMs <= 0) { await move(); return; }
  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    await move();
    await page.waitForTimeout(800).catch(() => {});
  }
}

/**
 * Click an element using Playwright's force option, which dispatches real
 * mouse events (mousedown, mouseup, click) but ignores any overlay that
 * intercepts pointer events. SAP listens to mousedown so this works correctly,
 * unlike a plain JS el.click() which only fires the click event.
 */
async function safeClick(page: Page, selector: string) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "attached", timeout: SELECTOR_TIMEOUT });
  await humanPause(page);
  await locator.click({ force: true });
  await waitForSapReady(page);
}

/**
 * Click the blue dropdown arrow for a SAP ComboBox.
 * Tries ID-based selector first, then falls back to finding the arrow near a label.
 * If the dropdown opens but no items load within 20s, closes it and retries up to 3x.
 */
export async function openDropdown(page: Page, arrowIdContains: string, labelHint?: string, minPause = 1500, maxPause = 3500) {
  // Inner function: one attempt to click the arrow
  async function clickArrow() {
    await waitForSapUnblock(page);
    await humanPause(page, minPause, maxPause);

    const byId = page.locator(`[id*="${arrowIdContains}"]`).first();
    const idVisible = await byId.isVisible({ timeout: 3000 }).catch(() => false);
    if (idVisible) {
      const elId = await byId.getAttribute("id");
      if (elId) { await safeClick(page, `#${elId}`); return; }
      await byId.click(); await sapWait(page); return;
    }

    if (labelHint) {
      const label = page.locator("label").filter({ hasText: new RegExp(labelHint, "i") }).first();
      if (await label.isVisible({ timeout: 2000 }).catch(() => false)) {
        const forAttr = await label.getAttribute("for").catch(() => null);
        if (forAttr) {
          const arrowId = forAttr.replace(/-inner$/, "") + "-arrow";
          if (await page.locator(`#${arrowId}`).isVisible({ timeout: 2000 }).catch(() => false)) {
            await safeClick(page, `#${arrowId}`); return;
          }
        }
      }
    }

    const parts = arrowIdContains.split(":");
    const index = parts[1] ? parseInt(parts[1], 10) : 0;
    const arrows = page.locator('span.sapMInputBaseIcon[role="button"]');
    const count = await arrows.count();
    for (let i = index; i < count; i++) {
      const arrow = arrows.nth(i);
      if (await arrow.isVisible()) {
        const elId = await arrow.getAttribute("id");
        if (elId) { await safeClick(page, `#${elId}`); return; }
        await arrow.click(); await sapWait(page); return;
      }
    }
  }

  // Retry loop: if dropdown opens but items never load, close and try again
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await clickArrow();

    // Wait up to 20s for at least one list item to appear
    const itemsLoaded = await page.waitForFunction(() => {
      const items = document.querySelectorAll("li.sapMLIB");
      return Array.from(items).some(el => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const s = window.getComputedStyle(el as HTMLElement);
        return rect.height > 0 && s.display !== "none" && s.visibility !== "hidden";
      });
    }, { timeout: 20000 }).then(() => true).catch(() => false);

    if (itemsLoaded) return; // dropdown populated — caller can now selectOption

    // Items never appeared — close the dropdown and retry
    await page.keyboard.press("Escape");
    await wiggleMouse(page);
    await page.waitForTimeout(2000 + attempt * 1000); // back-off: 3s, 4s, 5s
  }

  throw new Error(`Could not find dropdown: ${arrowIdContains} (label: ${labelHint})`);
}

/**
 * Read all visible option texts from the open SAP dropdown list.
 * Uses waitForFunction to detect actual visibility — avoids matching
 * stale hidden list items left over from previously-closed dropdowns.
 */
export async function readDropdownOptions(page: Page): Promise<string[]> {
  // Wait until at least one li.sapMLIB is genuinely visible on screen
  await page.waitForFunction(
    () => {
      const items = document.querySelectorAll("li.sapMLIB");
      return Array.from(items).some((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const style = window.getComputedStyle(el as HTMLElement);
        return rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
    },
    { timeout: SELECTOR_TIMEOUT }
  );

  // Collect text from all currently visible items
  const items = await page.locator("li.sapMLIB").all();
  const texts: string[] = [];
  for (const item of items) {
    if (await item.isVisible()) {
      const text = (await item.textContent())?.trim();
      if (text) texts.push(text);
    }
  }
  return texts;
}

/**
 * Click a specific option in the open SAP dropdown list by its exact text.
 * Uses waitForFunction to find genuinely visible items — avoids matching
 * stale hidden list items left in the DOM from previously-closed dropdowns.
 */
export async function selectOption(page: Page, text: string, minPause = 1500, maxPause = 3500) {
  // Wait until a visible li with exactly this text exists
  await page.waitForFunction(
    (searchText) => {
      const items = document.querySelectorAll("li.sapMLIB");
      return Array.from(items).some((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const style = window.getComputedStyle(el as HTMLElement);
        return (
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          (el.textContent?.trim() ?? "") === searchText
        );
      });
    },
    text,
    { timeout: SELECTOR_TIMEOUT }
  );

  // Find the visible item and click it
  const all = await page.locator("li.sapMLIB").all();
  for (const item of all) {
    if (await item.isVisible()) {
      const content = (await item.textContent())?.trim();
      if (content === text) {
        await humanPause(page, minPause, maxPause);
        await item.click();
        await sapWait(page);
        return;
      }
    }
  }
  throw new Error(`Visible option not found after wait: "${text}"`);
}

/**
 * Click the Next navigation button and wait for the page to settle.
 */
export async function clickNext(page: Page) {
  await waitForSapReady(page);
  await humanPause(page);

  // SAP keeps ALL wizard step buttons in the DOM simultaneously — .first() picks
  // the wrong (stale) one. Find the active Next button by iterating all candidates
  // and clicking the first one that is not disabled and has real screen coordinates.
  const allBtns = page.locator('[id*="nextnavbutton"], button:has(bdi:text("Next"))');
  await allBtns.first().waitFor({ state: "attached", timeout: SELECTOR_TIMEOUT });

  const count = await allBtns.count();
  let clicked = false;
  for (let i = count - 1; i >= 0; i--) {
    const btn = allBtns.nth(i);
    const disabled = await btn.getAttribute("disabled").catch(() => "1");
    if (disabled !== null) continue; // skip disabled buttons
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    const box = await btn.boundingBox();
    if (!box || box.width === 0 || box.height === 0) continue; // skip zero-size buttons
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    clicked = true;
    break;
  }

  if (!clicked) {
    // Last resort: click the last attached button via JS
    const last = allBtns.last();
    await last.evaluate((el: HTMLElement) => el.click());
  }

  await waitForSapReady(page, NAV_TIMEOUT, true);
}

/**
 * Log in to the Nirvana portal and handle the Agent Code intermediate page.
 * Leaves the browser on the SAP Fiori home page.
 */
export interface PortalCredential {
  username: string;
  password: string;
}

export async function loginToPortal(page: Page, credential?: PortalCredential, fast = false) {
  const username = credential?.username ?? USERNAME;
  const password = credential?.password ?? PASSWORD;
  const agentCode = credential?.username ?? AGENT_CODE;
  const pause = fast
    ? (min = 300, max = 600) => humanPause(page, min, max)
    : (min = 1500, max = 3500) => humanPause(page, min, max);

  await page.goto(PORTAL_URL, { waitUntil: "networkidle", timeout: NAV_TIMEOUT });

  // Login form
  await pause();
  await page.fill("#j_username", username);
  await pause();
  await page.fill("#j_password", password);
  await pause();
  await page.click('button[type="submit"]');
  await waitForSapReady(page, 30000, true);

  // Intermediate "Secondary Agent Code" page — may or may not appear
  const agentInput = page.locator('[id*="inputAgentCode-inner"]').first();
  const hasAgentPage = await agentInput.isVisible({ timeout: 8000 }).catch(() => false);

  if (hasAgentPage) {
    await pause();
    await openDropdown(page, "inputAgentCode-arrow");
    const options = await readDropdownOptions(page);
    const match = options.find((o) => o.includes(agentCode));
    if (match) {
      await selectOption(page, match);
    } else {
      await agentInput.click();
      await agentInput.fill(agentCode);
      await sapWait(page);
    }
    await pause();
    const agreeBtn = page
      .locator("button")
      .filter({ hasText: /agree to proceed/i })
      .first();
    await agreeBtn.waitFor({ state: "visible", timeout: SELECTOR_TIMEOUT });
    await agreeBtn.click();
    await pause();
    await page.waitForSelector(".sapMGT", { timeout: SELECTOR_TIMEOUT });
  }

  await page.waitForSelector(".sapMGT", { timeout: SELECTOR_TIMEOUT });
}

/**
 * Check if the portal session has expired (redirected to login page).
 * If so, log in again automatically and return to Fiori home.
 * Call this before any navigation that could fail due to session expiry.
 */
async function ensureSession(page: Page, onProgress?: (msg: string) => void) {
  const url = page.url();
  const isLoginPage =
    url.includes("accounts.ondemand.com") ||
    url.includes("saml2/idp/sso") ||
    url.includes("/login") ||
    (await page.locator("#j_username").isVisible({ timeout: 2000 }).catch(() => false));

  if (isLoginPage) {
    onProgress?.("Session expired — logging in again…");
    await loginToPortal(page);
    onProgress?.("Re-login successful");
  }
}

/**
 * Navigate to My Reservations → click + to open the new reservation wizard.
 */
export async function openNewReservationWizard(page: Page) {
  // Click "My Reservation" tile
  const tile = page
    .locator(".sapMGT")
    .filter({ hasText: /my reservation/i })
    .first();
  await tile.waitFor({ state: "visible", timeout: SELECTOR_TIMEOUT });
  await humanPause(page);
  await tile.click({ force: true, noWaitAfter: true });

  // Wait for the My Reservations list page to fully load
  await page.waitForSelector(".sapMPage", { timeout: SELECTOR_TIMEOUT });
  await waitForSapReady(page, NAV_TIMEOUT, true);
  await humanPause(page);

  // Target the "+" Add button directly by its aria-label/title="Add".
  // Fall back to the broader custom-icon selector if the label ever changes.
  const addBtn = page.locator('button.sapMBtn[aria-label="Add"], button.sapMBtn[title="Add"]').first();

  await addBtn.waitFor({ state: "visible", timeout: SELECTOR_TIMEOUT });
  await humanPause(page);
  await addBtn.click({ force: true, noWaitAfter: true });
  // Wait for wizard form to render after clicking "+"
  await waitForSapReady(page, NAV_TIMEOUT, true);
}

export type DiscoveredCombo = {
  productType: string;
  zone: string;
  section: string | null; // null = no section dropdown for this zone
};

/**
 * Discovery pass only — maps every product type / zone / section combination
 * for the given site. No Excel files are downloaded.
 *
 * onCombo: called immediately when each combo is found so callers can save
 *          to the DB before moving to the next zone ("discover one, save one").
 * doneZones: zones already in the DB — skipped to support resuming after a crash.
 */
export async function discoverSite(
  page: Page,
  site: string,
  onProgress: (msg: string) => void,
  onCombo?: (combo: DiscoveredCombo) => Promise<void>,
  doneZones: Set<string> = new Set()
): Promise<DiscoveredCombo[]> {
  const combinations: DiscoveredCombo[] = [];

  await openNewReservationWizard(page);

  // Step 1: Select Site
  await openDropdown(page, "inputSite-arrow");
  const siteOptions = await readDropdownOptions(page);
  onProgress(`Site options found: ${siteOptions.join(", ")}`);

  if (!siteOptions.includes(site)) {
    onProgress(`Site "${site}" not found in portal`);
    return combinations;
  }
  await selectOption(page, site);
  await clickNext(page);

  // Step 2: Read product types
  await openDropdown(page, "inputProduct-arrow", "Product Type");
  const productTypes = await readDropdownOptions(page);
  onProgress(`Product types: ${productTypes.join(", ")}`);
  await page.keyboard.press("Escape");
  await sapWait(page);

  // Step 3: For each product type, discover all zones and sections
  for (const productType of productTypes) {
    onProgress(`Discovering zones for: ${productType}`);
    await openDropdown(page, "inputProduct-arrow", "Product Type");
    await selectOption(page, productType);
    await clickNext(page);

    await openDropdown(page, "inputZone-arrow", "Zone");
    const zones = await readDropdownOptions(page);
    onProgress(`  Zones: ${zones.join(", ")}`);
    await page.keyboard.press("Escape");
    await sapWait(page);

    for (const zone of zones) {
      if (doneZones.has(zone)) {
        onProgress(`  ${zone} — already saved, skipping`);
        continue;
      }

      await openDropdown(page, "inputZone-arrow", "Zone");
      await selectOption(page, zone);
      await waitForSapReady(page, 30000);
      const sectionArrow = page.locator('[id*="sectionlist-arrow"]').first();
      const hasSection = await sectionArrow
        .waitFor({ state: "visible", timeout: SECTION_TIMEOUT })
        .then(() => true)
        .catch(() => false);

      if (hasSection) {
        await openDropdown(page, "sectionlist-arrow", "Section");
        const sections = await readDropdownOptions(page);
        onProgress(`    Sections for ${zone}: ${sections.join(", ")}`);
        await page.keyboard.press("Escape");
        await sapWait(page);
        for (const section of sections) {
          const combo: DiscoveredCombo = { productType, zone, section };
          combinations.push(combo);
          if (onCombo) await onCombo(combo);
        }
      } else {
        const combo: DiscoveredCombo = { productType, zone, section: null };
        combinations.push(combo);
        if (onCombo) await onCombo(combo);
      }

      doneZones.add(zone);

      // Reset zone dropdown for next zone
      await openDropdown(page, "inputZone-arrow", "Zone");
      await page.keyboard.press("Escape");
      await sapWait(page);
    }

    // Navigate back to product type step for the next product type
    await restartWizardToProductTypeStep(page, site, onProgress);
  }

  onProgress(`Discovery complete. ${combinations.length} combinations found.`);
  return combinations;
}

/**
 * Full cycle for ONE product type: discover zones/sections, download each
 * Excel file, and return the buffers. Skips combos already in doneKeys.
 *
 * doneKeys format: "zone||section" (use empty string for null section)
 * Called once per product type so that if an error occurs, the caller can
 * catch it, save what succeeded, and resume from the next product type.
 */
/**
 * Discover all zone/section combos for ONE product type.
 * Assumes the browser is already at the product type step.
 * Returns after discovery — does NOT download any Excel files.
 * After returning, the browser is back at the product type step.
 */
export async function discoverProductType(
  page: Page,
  site: string,
  productType: string,
  onProgress: (msg: string) => void,
  // Called immediately when each combo is found — saves to DB before moving to next zone
  onCombo: (combo: { zone: string; section: string | null }) => Promise<void>,
  // Zones already in DB — skip these
  doneZones: Set<string> = new Set()
): Promise<number> {
  onProgress(`[${productType}] Selecting product type…`);
  await openDropdown(page, "inputProduct-arrow", "Product Type");
  await selectOption(page, productType);
  await clickNext(page);

  await openDropdown(page, "inputZone-arrow", "Zone");
  const zones = await readDropdownOptions(page);
  onProgress(`[${productType}] Zones: ${zones.join(", ")}`);
  await page.keyboard.press("Escape");
  await sapWait(page);

  let saved = 0;

  for (const zone of zones) {
    if (doneZones.has(zone)) {
      onProgress(`[${productType}] ${zone} — already in DB, skipping`);
      continue;
    }

    await openDropdown(page, "inputZone-arrow", "Zone");
    await selectOption(page, zone);
    await waitForSapReady(page, 30000);

    const sectionArrow = page.locator('[id*="sectionlist-arrow"]').first();
    const hasSection = await sectionArrow
      .waitFor({ state: "visible", timeout: SECTION_TIMEOUT })
      .then(() => true)
      .catch(() => false);

    if (hasSection) {
      await openDropdown(page, "sectionlist-arrow", "Section");
      const sections = await readDropdownOptions(page);
      onProgress(`[${productType}] ${zone} — sections: ${sections.join(", ")}`);
      await page.keyboard.press("Escape");
      await sapWait(page);
      for (const section of sections) {
        await onCombo({ zone, section });
        saved++;
      }
    } else {
      onProgress(`[${productType}] ${zone} — no section`);
      await onCombo({ zone, section: null });
      saved++;
    }
  }

  onProgress(`[${productType}] ${saved} new combo(s) saved`);
  return saved;
}

/**
 * Read just the product type list from the portal.
 * Assumes the browser is already at the product type step.
 */
export async function getProductTypes(page: Page): Promise<string[]> {
  await openDropdown(page, "inputProduct-arrow", "Product Type");
  const types = await readDropdownOptions(page);
  await page.keyboard.press("Escape");
  await sapWait(page);
  return types;
}

/**
 * Used by the web API route — runs discovery only (no downloads).
 */
export async function downloadFilesForSite(
  page: Page,
  site: string,
  onProgress: (msg: string) => void,
  onCombo?: (combo: DiscoveredCombo) => Promise<void>,
  doneZones?: Set<string>
): Promise<DownloadedFile[]> {
  await discoverSite(page, site, onProgress, onCombo, doneZones);
  onProgress(`Discovery complete. Go to the Product Sync page to select what to download.`);
  return []; // no files downloaded — download is triggered separately
}

/**
 * Dismiss any SAP dialog/popup that may appear (e.g. "No image found").
 * Waits up to 4 seconds for a dialog; if none appears, returns immediately.
 */
async function dismissPopupIfAny(page: Page, onProgress: (msg: string) => void) {
  try {
    // Strategy 1: standard SAP dialog/messagebox selectors
    const dialog = page.locator('.sapMDialog, .sapMMessageBox, .sapMPopup').filter({ visible: true }).first();
    const appeared = await dialog.waitFor({ state: "visible", timeout: 4000 })
      .then(() => true).catch(() => false);

    if (appeared) {
      onProgress("Popup detected — dismissing…");
      const emphasizedBtn = dialog.locator('.sapMBtnEmphasized').first();
      const mboxBtn       = page.locator('[id*="mbox-btn"]').first();
      const lastBtn       = dialog.locator('button').last();
      for (const btn of [emphasizedBtn, mboxBtn, lastBtn]) {
        const visible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
        if (visible) {
          await btn.scrollIntoViewIfNeeded().catch(() => {});
          const box = await btn.boundingBox();
          if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          else await btn.evaluate((el: HTMLElement) => el.click());
          await waitForSapReady(page);
          onProgress("Popup dismissed.");
          return;
        }
      }
    }

    // Strategy 2: find any visible "Close" or "OK" button anywhere on the page
    // (catches popups that use non-standard SAP dialog classes)
    const clicked = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"]'));
      for (const el of candidates) {
        const text = (el.textContent ?? "").trim().toLowerCase();
        if (text !== "close" && text !== "ok") continue;
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el as HTMLElement);
        if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) continue;
        (el as HTMLElement).click();
        return true;
      }
      return false;
    });
    if (clicked) {
      onProgress("Popup dismissed via fallback Close button.");
      await waitForSapReady(page);
    }
  } catch { /* no popup — continue */ }
}

/**
 * Click the Download button, wait for the dialog, click Excel, and capture the buffer.
 */
async function downloadExcel(
  page: Page,
  onProgress: (msg: string) => void
): Promise<Buffer | null> {
  try {
    // Wait for the layout grid to fully render — slowest step on a slow portal
    await waitForSapReady(page, NAV_TIMEOUT);

    // Poll until the download button appears, dismissing any blocking popup each iteration.
    // The "No image found!" dialog can appear at any time while the layout renders —
    // a single up-front check misses it if it appears late.
    const downloadBtn = page
      .locator('[id*="downloadBtn"], button:has(bdi:text("Download"))')
      .first();
    const pollDeadline = Date.now() + DOWNLOAD_TIMEOUT;
    let btnReady = false;
    while (!btnReady && Date.now() < pollDeadline) {
      await dismissPopupIfAny(page, onProgress);
      btnReady = await downloadBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (!btnReady) await page.waitForTimeout(1000);
    }
    if (!btnReady) throw new Error("Download button not found after waiting");
    await downloadBtn.waitFor({ state: "attached", timeout: 10000 });
    await downloadBtn.scrollIntoViewIfNeeded().catch(() => {});
    await downloadBtn.click({ force: true, noWaitAfter: true });

    // Wait for the download dialog and Excel button
    const excelBtn = page
      .locator('[id*="DownloadExcelBtn"], button:has(bdi:text("Excel"))')
      .first();
    await excelBtn.waitFor({ state: "attached", timeout: SELECTOR_TIMEOUT });

    // Intercept the file download before clicking Excel.
    // noWaitAfter: true — Excel click triggers a file download, not page navigation.
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: DOWNLOAD_TIMEOUT }),
      (async () => {
        await excelBtn.scrollIntoViewIfNeeded().catch(() => {});
        await excelBtn.click({ force: true, noWaitAfter: true });
      })(),
    ]);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    onProgress(`    Downloaded Excel (${chunks.reduce((s, c) => s + c.length, 0)} bytes)`);
    return Buffer.concat(chunks);
  } catch (err) {
    onProgress(`    Download failed: ${err}`);
    return null;
  }
}

/**
 * Navigate one fresh combo (productType / zone / section) from the product type step
 * and download the Excel file. Always starts from the product type dropdown.
 */
export async function downloadOneFile(
  page: Page,
  site: string,
  productType: string,
  zone: string,
  section: string | null,
  onProgress: (msg: string) => void,
  signal?: AbortSignal
): Promise<Buffer | null> {
  const MAX_SESSION_TRIES = 3;

  for (let sessionTry = 1; sessionTry <= MAX_SESSION_TRIES; sessionTry++) {
    if (signal?.aborted) throw new Error("ABORTED");
    if (sessionTry > 1) {
      onProgress(`  Session retry ${sessionTry}/${MAX_SESSION_TRIES} — navigating back without logging out…`);
      // Human-like pause before navigating back — mimics a person waiting before retrying
      await humanPause(page, 5000, 9000);
      if (signal?.aborted) throw new Error("ABORTED");
      // Go back to home and re-enter wizard without logging out.
      // If the portal itself is broken this throws PORTAL_BROKEN and exits the loop.
      await restartWizardToProductTypeStep(page, site, onProgress);
    }

    try {
      // Select product type, zone, section with faster pauses — these are
      // within-page dropdowns on an already-loaded wizard step, not page transitions.
      const fast = [600, 1200] as const;
      await openDropdown(page, "inputProduct-arrow", "Product Type", ...fast);
      await selectOption(page, productType, ...fast);
      await dismissPopupIfAny(page, onProgress);
      await clickNext(page);

      // Select zone
      await openDropdown(page, "inputZone-arrow", "Zone", ...fast);
      await selectOption(page, zone, ...fast);
      await dismissPopupIfAny(page, onProgress);
      await sapWait(page);

      // Check for section dropdown
      await waitForSapReady(page, 30000);
      await dismissPopupIfAny(page, onProgress);
      const sectionArrow = page.locator('[id*="sectionlist-arrow"]').first();
      const hasSectionNow = await sectionArrow
        .waitFor({ state: "visible", timeout: SECTION_TIMEOUT })
        .then(() => true)
        .catch(() => false);

      if (hasSectionNow) {
        if (!section) {
          onProgress(`  Skipping ${productType}/${zone} — section required but none provided`);
          return null;
        }
        await openDropdown(page, "sectionlist-arrow", "Section", ...fast);
        await selectOption(page, section, ...fast);
        await dismissPopupIfAny(page, onProgress);
      }

      await clickNext(page);
      const buf = await downloadExcel(page, onProgress);
      if (buf) return buf;

      // buf null but no exception — download silently failed, retry within same session
      onProgress(`  Download returned empty on try ${sessionTry} — will retry within same session`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // PORTAL_BROKEN must propagate immediately — no point retrying within same session
      if (msg.includes("PORTAL_BROKEN")) throw err;
      onProgress(`  Session try ${sessionTry} failed: ${msg}`);
      if (sessionTry >= MAX_SESSION_TRIES) {
        throw new Error(`All ${MAX_SESSION_TRIES} session tries failed. Last: ${msg}`);
      }
    }
  }

  return null;
}

/**
 * Navigate back to the Fiori home and re-enter the wizard up to the product type step.
 * This is the most reliable "reset" — it always starts from a known state.
 * Called between product types (discovery) and before every download.
 */
export async function restartWizardToProductTypeStep(
  page: Page,
  site: string,
  onProgress?: (msg: string) => void
) {
  // Hard navigate to Fiori home — clears any stuck wizard state
  await page.goto(PORTAL_URL, { waitUntil: "networkidle", timeout: NAV_TIMEOUT }).catch(() => {});

  // Re-authenticate if session expired
  await ensureSession(page, onProgress);

  // Wait for the tile grid to fully load, then pause before touching anything
  await page.waitForSelector(".sapMGT", { timeout: SELECTOR_TIMEOUT });
  await waitForSapReady(page, NAV_TIMEOUT, true);
  await humanPause(page, 3000, 6000);

  // Open the wizard
  await openNewReservationWizard(page);

  // Detect "App could not be opened" — portal is blocking this session.
  // Don't auto-dismiss: wait for the user to manually click it away, then stop
  // this item cleanly (reset to pending) without retrying.
  const brokenDialog = page.locator('.sapMDialog, .sapMMessageBox').filter({ visible: true })
    .filter({ hasText: /could not be opened/i }).first();
  if (await brokenDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    onProgress?.("⚠ Portal blocked — please dismiss the dialog manually. This item will reset to pending.");
    // Wait up to 5 minutes for the user to click it away
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      const stillVisible = await brokenDialog.isVisible({ timeout: 2000 }).catch(() => false);
      if (!stillVisible) break;
      await page.waitForTimeout(2000);
    }
    throw new Error("PORTAL_BLOCKED_MANUAL");
  }

  await waitForSapUnblock(page);

  // Wait for Site dropdown — confirms wizard step 1 is ready
  await page.locator('[id*="inputSite-arrow"]').first()
    .waitFor({ state: "visible", timeout: SELECTOR_TIMEOUT });

  // Select site and proceed to product type step
  await openDropdown(page, "inputSite-arrow", "Site");
  await selectOption(page, site);
  await clickNext(page);
}

/**
 * Navigate back one step in the SAP wizard.
 * Tries three strategies in order:
 *  1. Click the breadcrumb step label
 *  2. Click the SAP back arrow button in the page header
 *  3. Browser history back (last resort)
 */
async function goBackToStep(page: Page, stepLabel: string) {
  // Strategy 1: click breadcrumb step by text
  try {
    const crumb = page
      .locator("[class*='WizardProgressNav'] span, [class*='WizardProgressNav'] bdi")
      .filter({ hasText: new RegExp(`^${stepLabel}$`, "i") })
      .first();
    if (await crumb.isVisible({ timeout: 3000 }).catch(() => false)) {
      await crumb.click();
      await waitForSapReady(page, NAV_TIMEOUT);
      return;
    }
  } catch { /* continue */ }

  // Strategy 2: SAP back arrow button
  try {
    const backBtn = page
      .locator("button[aria-label*='Back'], button[title*='Back'], .sapMNavBackButton")
      .first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await waitForSapReady(page, NAV_TIMEOUT);
      return;
    }
  } catch { /* continue */ }

  // Strategy 3: browser back
  await page.goBack({ waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT }).catch(() => {});
  await sapWait(page);
}
