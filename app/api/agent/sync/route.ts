import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const OWNER = process.env.GITHUB_REPO_OWNER!;
const REPO = process.env.GITHUB_REPO_NAME!;
const WORKFLOW_FILE = "portal-sync.yml";

const ghHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export async function POST(request: NextRequest) {
  // Auth: verify session cookie exists (avoid NextResponse import — breaks Turbopack on streaming routes)
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  if (!hasSession) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const { site, zone } = await request.json();

  if (!site || !zone)
    return new Response(JSON.stringify({ error: "site and zone are required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });

  // Look up discovery rows for this site + zone
  const { data: rows, error: discErr } = await supabaseAdmin
    .from("product_sync_discovery")
    .select("*")
    .eq("site", site)
    .eq("zone", zone);

  if (discErr)
    return new Response(JSON.stringify({ error: discErr.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });

  if (!rows || rows.length === 0)
    return new Response(
      JSON.stringify({ error: `No discovery data found for ${site} / ${zone}.` }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );

  const productType = rows[0].product_type as string;

  // Trigger GitHub Actions workflow
  const triggerRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: "master",
        inputs: { site, zone, product_type: productType },
      }),
    }
  );

  if (!triggerRes.ok) {
    const err = await triggerRes.text();
    return new Response(JSON.stringify({ error: `Failed to trigger download: ${err}` }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  // Wait briefly for GitHub to register the run, then get the run ID
  await new Promise(r => setTimeout(r, 5000));

  const runsRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
    { headers: ghHeaders }
  );
  const runsData = await runsRes.json();
  const run = (runsData.workflow_runs ?? [])[0];
  const runId = run?.id ?? null;

  // Return immediately with runId — client will poll /api/agent/sync/status
  return new Response(JSON.stringify({ triggered: true, runId }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
