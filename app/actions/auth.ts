"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

async function logLoginAttempt(email: string, success: boolean, blockedReason?: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent") ?? null;
  await supabaseAdmin.from("login_attempts").insert({ email, success, ip_address: ip, user_agent: userAgent, blocked_reason: blockedReason ?? null });
}

export async function loginAction(
  _prevState: { error: string; redirectTo?: string } | null,
  formData: FormData
): Promise<{ error: string; redirectTo?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await logLoginAttempt(email, false);
    return { error: "Invalid email or password." };
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .single();

  // Device binding + single active session enforcement for agents
  if (roleData?.role === "agent") {
    const deviceFingerprint = String(formData.get("device_id") ?? "").trim();

    if (!deviceFingerprint) {
      await supabaseAdmin.auth.admin.signOut(authData.user.id);
      await logLoginAttempt(email, true, "missing_device_id");
      return { error: "Device ID missing. Please enable cookies and try again." };
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
      return { error: "", redirectTo: "/login?reason=device_bound" };
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
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  await logLoginAttempt(email, true);

  // Return the redirect URL to the client — the login page will do a hard
  // window.location.href navigation so iOS Safari picks up the session cookie.
  return { error: "", redirectTo: roleData?.role === "admin" ? "/" : "/agent" };
}

export async function logoutAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Clear the active session record on logout
  if (user) {
    await supabaseAdmin.from("active_sessions").delete().eq("user_id", user.id);
  }

  const cookieStore = await cookies();
  cookieStore.delete("agent_device_token");

  await supabase.auth.signOut();
  redirect("/login");
}
