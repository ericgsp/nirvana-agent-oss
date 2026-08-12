import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { headers, cookies } from "next/headers";
import { randomUUID } from "crypto";
import { corsJson, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";

// Route Handler equivalent of the old loginAction Server Action. Server
// Actions rely on same-origin framing that doesn't work cleanly from the
// locally-bundled shell's capacitor://localhost origin calling the Vercel
// domain -- a plain POST route works the same way any other cross-origin
// fetch does. Logic below is otherwise unchanged from the original action.
async function logLoginAttempt(email: string, success: boolean, blockedReason?: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent") ?? null;
  await supabaseAdmin.from("login_attempts").insert({ email, success, ip_address: ip, user_agent: userAgent, blocked_reason: blockedReason ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");
  const deviceIdInput = String(body?.device_id ?? "").trim();

  if (!email || !password) {
    return corsJson(req, { error: "Email and password are required." });
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await logLoginAttempt(email, false);
    return corsJson(req, { error: "Invalid email or password." });
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .single();

  // Device binding + single active session enforcement for agents
  if (roleData?.role === "agent") {
    const deviceFingerprint = deviceIdInput;

    if (!deviceFingerprint) {
      await supabaseAdmin.auth.admin.signOut(authData.user.id);
      await logLoginAttempt(email, true, "missing_device_id");
      return corsJson(req, { error: "Device ID missing. Please enable cookies and try again." });
    }

    // Check if this account is already bound to a device
    const { data: binding } = await supabaseAdmin
      .from("device_bindings")
      .select("device_fingerprint")
      .eq("user_id", authData.user.id)
      .single();

    if (binding && binding.device_fingerprint !== deviceFingerprint) {
      // Bound to a different device — reject login. Credentials were valid,
      // which makes this the single most useful signal for "someone else is
      // trying to use a leaked/shared password" -- logged distinctly so it
      // doesn't blend into normal successful logins in the audit log.
      await supabaseAdmin.auth.admin.signOut(authData.user.id);
      await logLoginAttempt(email, true, "device_mismatch");
      return corsJson(req, { error: "", redirectTo: "/login?reason=device_bound" });
    }

    if (!binding) {
      // First login — bind this device
      const h = await headers();
      const userAgent = h.get("user-agent") ?? null;
      await supabaseAdmin.from("device_bindings").insert({
        user_id: authData.user.id,
        device_fingerprint: deviceFingerprint,
        user_agent: userAgent,
      });
    }

    // Update active session token (single session enforcement)
    const deviceToken = randomUUID();
    await supabaseAdmin
      .from("active_sessions")
      .upsert(
        { user_id: authData.user.id, device_token: deviceToken, logged_in_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    const cookieStore = await cookies();
    cookieStore.set("agent_device_token", deviceToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  await logLoginAttempt(email, true);

  return corsJson(req, { error: "", redirectTo: roleData?.role === "admin" ? "/" : "/agent" });
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}
