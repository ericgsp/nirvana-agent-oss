import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const OWNER = process.env.GITHUB_REPO_OWNER!;
const REPO = process.env.GITHUB_REPO_NAME!;
const WORKFLOW_FILE = "portal-sync.yml";

const ghHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

// POST — trigger a workflow run, return the run_id
export async function POST(request: NextRequest) {
  const { site, zone, product_type } = await request.json();
  if (!site || !zone || !product_type)
    return NextResponse.json({ error: "site, zone and product_type are required" }, { status: 400 });

  // Trigger the workflow
  const triggerRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: "master",
        inputs: { site, zone, product_type },
      }),
    }
  );

  if (!triggerRes.ok) {
    const err = await triggerRes.text();
    return NextResponse.json({ error: `GitHub API error: ${err}` }, { status: 500 });
  }

  // Wait 3s for GitHub to register the run, then find its run_id
  await new Promise(r => setTimeout(r, 3000));

  const runsRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
    { headers: ghHeaders }
  );
  const runsData = await runsRes.json();
  const run = (runsData.workflow_runs ?? [])[0];

  return NextResponse.json({ run_id: run?.id ?? null });
}

// GET — poll run status
export async function GET(request: NextRequest) {
  const run_id = request.nextUrl.searchParams.get("run_id");
  if (!run_id)
    return NextResponse.json({ error: "run_id required" }, { status: 400 });

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${run_id}`,
    { headers: ghHeaders }
  );
  const data = await res.json();

  return NextResponse.json({
    status: data.status,         // queued | in_progress | completed
    conclusion: data.conclusion, // success | failure | null
  });
}
