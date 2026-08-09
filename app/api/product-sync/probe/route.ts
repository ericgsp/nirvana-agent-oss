import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";
import { loginToPortal, restartWizardToProductTypeStep, getProductTypes } from "@/lib/product-sync/scraper";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });

  const { site, credential_id } = await request.json();
  if (!site)
    return new Response(JSON.stringify({ error: "site is required" }), {
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

  try {
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

    await loginToPortal(page, credential);
    await restartWizardToProductTypeStep(page, site);
    const productTypes = await getProductTypes(page);
    await browser.close();

    return new Response(JSON.stringify({ productTypes }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
