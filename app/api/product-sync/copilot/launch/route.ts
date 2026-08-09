import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { credential_id?: string };

  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const chromePath = chromePaths.find(p => fs.existsSync(p));
  if (!chromePath) {
    return NextResponse.json({ error: "Chrome not found on this machine" }, { status: 500 });
  }

  const profileDir = path.join(process.env.LOCALAPPDATA ?? "C:\\Users\\Default\\AppData\\Local", "NirvanaSyncChrome");
  const portalUrl  = "https://flpnwc-cc2c2c251.dispatcher.ap1.hana.ondemand.com/sites?siteId=ca8971d5-a7d7-4031-9b80-c58872b01a34#Shell-home";

  const child = spawn(chromePath, [
    "--remote-debugging-port=9222",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    portalUrl,
  ], { detached: true, stdio: "ignore" });
  child.unref();

  // Auto-fill login form if a credential was selected
  if (body.credential_id) {
    const { data: cred } = await supabaseAdmin
      .from("nirvana_credentials")
      .select("username, password")
      .eq("id", body.credential_id)
      .single();

    if (cred?.username && cred?.password) {
      autoFillLogin(cred.username, cred.password).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Background task — waits for Chrome to start and the SAP login page to appear,
 * then fills in username and password. Does NOT click the Sign In button.
 */
async function autoFillLogin(username: string, password: string): Promise<void> {
  const { chromium } = await import("playwright-core");

  // Wait up to 30 seconds for Chrome to become reachable
  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      browser = await chromium.connectOverCDP("http://localhost:9222", { timeout: 3000 });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!browser) return;

  try {
    // Wait up to 20 seconds for the login page with a username field
    const loginDeadline = Date.now() + 20_000;
    while (Date.now() < loginDeadline) {
      const pages = browser.contexts().flatMap(c => c.pages());
      for (const page of pages) {
        // SAP login form has fields with id "j_username" and "j_password"
        const userField = page.locator("#j_username, input[name='j_username'], input[type='text'][id*='user']").first();
        const visible = await userField.isVisible({ timeout: 500 }).catch(() => false);
        if (visible) {
          await userField.fill(username);
          const passField = page.locator("#j_password, input[name='j_password'], input[type='password']").first();
          await passField.fill(password);
          return;
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  } finally {
    await browser.close().catch(() => {});
  }
}
