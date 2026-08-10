import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const html: string | undefined = body?.html;
  const css: string | undefined = body?.css;

  if (!html || typeof html !== "string") {
    return new Response(JSON.stringify({ error: "html is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fullHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${css || ""}</style></head><body style="margin:0">${html}</body></html>`;

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

  try {
    // The quote HTML is fully self-contained (inline styles, data-URI
    // watermark) — no JS or network access is needed to render it, so both
    // are disabled to close off SSRF/abuse via arbitrary client-supplied HTML.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.route("**/*", (route) => route.abort());

    await page.setContent(fullHtml);
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: { "Content-Type": "application/pdf" },
    });
  } finally {
    await browser.close();
  }
}
