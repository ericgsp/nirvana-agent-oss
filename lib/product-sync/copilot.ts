import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CDP_URL = "http://localhost:9222";
const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");
const DOWNLOAD_WAIT_MS = 90_000;

export type CopilotStatus = {
  chromeConnected: boolean;
  layoutReady: boolean;
  pageTitle?: string;
  error?: string;
};

/**
 * Connect to Chrome on port 9222 and check whether a layout page
 * (with the Download button visible) is currently open in any tab.
 */
export async function getCopilotStatus(): Promise<CopilotStatus> {
  const { chromium } = await import("playwright-core");
  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;
  try {
    browser = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
    const pages = browser.contexts().flatMap((c) => c.pages());
    for (const page of pages) {
      const hasBtn = await page
        .locator('[id*="downloadBtn"], button:has(bdi:text("Download"))')
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (hasBtn) {
        const title = await page.title().catch(() => "");
        return { chromeConnected: true, layoutReady: true, pageTitle: title };
      }
    }
    return { chromeConnected: true, layoutReady: false };
  } catch (err) {
    return { chromeConnected: false, layoutReady: false, error: String(err) };
  } finally {
    await browser?.close().catch(() => {});
  }
}

/**
 * Connect to Chrome, find the layout page, click Download → Excel,
 * then watch the Downloads folder for the new file and return its buffer.
 *
 * Downloads go to Chrome's own Downloads folder (not intercepted by Playwright
 * when connecting via CDP), so we use a file-system watch as the capture method.
 */
export async function captureLayoutExcel(
  onLog: (msg: string) => void
): Promise<Buffer> {
  // Snapshot Downloads folder BEFORE clicking anything
  const beforeFiles = new Set<string>(
    fs.existsSync(DOWNLOADS_DIR) ? fs.readdirSync(DOWNLOADS_DIR) : []
  );

  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 5000 });
  try {
    const pages = browser.contexts().flatMap((c) => c.pages());
    let targetPage: (typeof pages)[0] | null = null;
    for (const page of pages) {
      const hasBtn = await page
        .locator('[id*="downloadBtn"], button:has(bdi:text("Download"))')
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (hasBtn) { targetPage = page; break; }
    }
    if (!targetPage) throw new Error("No layout page found — navigate to the layout grid in Chrome first");

    onLog("Clicking Download button...");
    await targetPage
      .locator('[id*="downloadBtn"], button:has(bdi:text("Download"))')
      .first()
      .click({ force: true, noWaitAfter: true });

    onLog("Waiting for download dialog...");
    const excelBtn = targetPage
      .locator('[id*="DownloadExcelBtn"], button:has(bdi:text("Excel"))')
      .first();
    await excelBtn.waitFor({ state: "visible", timeout: 20000 });
    await excelBtn.click({ force: true, noWaitAfter: true });
    onLog("Clicked Excel — watching Downloads folder for file...");
  } finally {
    await browser.close().catch(() => {});
  }

  // Poll Downloads folder for a new .xls / .xlsx / .htm file
  const deadline = Date.now() + DOWNLOAD_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 600));
    if (!fs.existsSync(DOWNLOADS_DIR)) continue;
    for (const f of fs.readdirSync(DOWNLOADS_DIR)) {
      if (beforeFiles.has(f)) continue;
      if (f.endsWith(".crdownload") || f.endsWith(".tmp")) continue;
      const ext = path.extname(f).toLowerCase();
      if (![".xls", ".xlsx", ".htm", ".html"].includes(ext)) continue;
      const filePath = path.join(DOWNLOADS_DIR, f);
      const buffer = fs.readFileSync(filePath);
      onLog(`File captured: ${f} (${buffer.length} bytes)`);
      try { fs.unlinkSync(filePath); } catch { /* leave it if delete fails */ }
      return buffer;
    }
  }

  throw new Error(`Download timed out after ${DOWNLOAD_WAIT_MS / 1000}s — file not found in ${DOWNLOADS_DIR}`);
}
