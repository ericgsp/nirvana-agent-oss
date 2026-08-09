import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/supabase/get-role";

export async function GET() {
  const role = await getUserRole();
  return NextResponse.json({ role });
}
