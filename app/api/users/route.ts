import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

const OWNER_ID = "0b5ff8ea-760a-4d17-8a30-47a2c90fe8d1";

// GET — list all auth users with their current role and device binding status
export async function GET() {
  const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
  const roleMap = Object.fromEntries((roles ?? []).map((r) => [r.user_id, r.role]));

  const { data: bindings } = await supabaseAdmin.from("device_bindings").select("user_id, bound_at, user_agent");
  const bindingMap = Object.fromEntries((bindings ?? []).map((b) => [b.user_id, { bound_at: b.bound_at, user_agent: b.user_agent }]));

  const users = authUsers.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    role: roleMap[u.id] ?? null,
    device_bound_at: bindingMap[u.id]?.bound_at ?? null,
    device_user_agent: bindingMap[u.id]?.user_agent ?? null,
  }));

  return NextResponse.json({ users });
}

// POST — create user OR set role
// { action: "create", email, password, role } — create new user
// { action: "set_role", user_id, role } — update existing user role
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "create") {
    const { email, password, role } = body;
    if (!email || !password || !["admin", "agent"].includes(role)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user.id, role });
    if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  // set_role
  const { user_id, role } = body;
  if (!user_id || !["admin", "agent"].includes(role)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (user_id === OWNER_ID) {
    return NextResponse.json({ error: "This user's role cannot be changed." }, { status: 403 });
  }
  const { error } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id, role }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove role from a user
export async function DELETE(req: NextRequest) {
  const body = await req.json();

  // Reset device binding
  if (body.action === "reset_device") {
    const { user_id } = body;
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    await supabaseAdmin.from("device_bindings").delete().eq("user_id", user_id);
    await supabaseAdmin.from("active_sessions").delete().eq("user_id", user_id);
    return NextResponse.json({ ok: true });
  }

  const { user_id } = body;
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  if (user_id === OWNER_ID) {
    return NextResponse.json({ error: "This user's role cannot be changed." }, { status: 403 });
  }
  const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
