import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const OWNER = process.env.GITHUB_REPO_OWNER!;
const REPO = process.env.GITHUB_REPO_NAME!;

const ghHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const runId = p.get("runId");
  const site  = p.get("site")  ?? "";
  const zone  = p.get("zone")  ?? "";

  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  // Check GitHub Actions run status
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${runId}`,
    { headers: ghHeaders }
  );
  const data = await res.json();

  const status    = data.status;     // queued | in_progress | completed
  const conclusion = data.conclusion; // success | failure | cancelled | null

  if (status !== "completed") {
    return NextResponse.json({ status: "running" });
  }

  if (conclusion !== "success") {
    return NextResponse.json({ status: "failed", error: `GitHub Actions ${conclusion}` });
  }

  // Workflow succeeded — get available counts from DB
  let available = 0;
  let total = 0;
  if (site && zone) {
    const { data: avail } = await supabaseAdmin
      .from("product_availability")
      .select("available")
      .eq("site", site)
      .eq("zone", zone);
    total     = avail?.length ?? 0;
    available = avail?.filter((r: any) => r.available).length ?? 0;
  }

  return NextResponse.json({ status: "success", available, total });
}
