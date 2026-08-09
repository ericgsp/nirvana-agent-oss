import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";
import { loginToPortal } from "@/lib/product-sync/scraper";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id } = await request.json();

  const { data: cred, error } = await supabaseAdmin
    .from("nirvana_credentials")
    .select("username, password, label")
    .eq("id", id)
    .single();

  if (error || !cred)
    return new Response(JSON.stringify({ ok: false, message: "Credential not found" }), { status: 404 });

  try {
    const { chromium } = await import("playwright-core");
    const executablePath = process.env.CHROME_EXECUTABLE_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    const browser = await chromium.launch({ executablePath, headless: true });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

    await loginToPortal(page, { username: cred.username, password: cred.password });
    await browser.close();

    return new Response(JSON.stringify({ ok: true, message: "Login successful" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, message: msg }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
