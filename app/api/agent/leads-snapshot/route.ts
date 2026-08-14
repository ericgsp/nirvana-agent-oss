import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ leads: [] });

  const [{ data: leads }, { data: quotes }] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id, name, phone, source, notes, label, next_action_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("recent_quotes")
      .select("id, site, product, section, net_total, customer_name, customer_phone, valid_until, items, status, closed_items, closed_at, last_instalment_date, lead_id, created_at")
      .eq("user_id", user.id)
      .not("lead_id", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const quotesByLead: Record<string, typeof quotes> = {};
  (quotes ?? []).forEach((q) => {
    const lid = q.lead_id as string;
    (quotesByLead[lid] ??= []).push(q);
  });

  const leadsWithQuotes = (leads ?? []).map((l) => ({
    ...l,
    quotes: quotesByLead[l.id] ?? [],
  }));

  return Response.json({ leads: leadsWithQuotes });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  const LABELS = ["prospect", "hot", "cold", "customer"];

  if (action === "add_lead") {
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const label = LABELS.includes(body?.label) ? body.label : "prospect";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    const nextActionDate = typeof body?.nextActionDate === "string" ? body.nextActionDate : null;
    if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
    const { error } = await supabaseAdmin.from("leads").insert({
      user_id: user.id, name, phone: phone || null, source: "manual",
      label, notes: notes || null, next_action_date: nextActionDate || null,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  // Edits an existing lead's own fields -- separate from a quote's own Edit
  // (customer name/phone on the quote itself), which stays independent so
  // the two never surprise-overwrite each other.
  if (action === "update_lead") {
    const id = body?.id;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const label = LABELS.includes(body?.label) ? body.label : "prospect";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    const nextActionDate = typeof body?.nextActionDate === "string" ? body.nextActionDate : null;
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ name, phone: phone || null, label, notes: notes || null, next_action_date: nextActionDate || null })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === "bulk_import") {
    const contacts = Array.isArray(body?.contacts) ? body.contacts : [];
    if (!contacts.length) return Response.json({ error: "No contacts provided" }, { status: 400 });

    // Skip contacts whose phone already exists as a lead for this agent --
    // syncing the same phone contacts repeatedly shouldn't pile up duplicates.
    const { data: existing } = await supabaseAdmin
      .from("leads").select("phone").eq("user_id", user.id).not("phone", "is", null);
    const existingPhones = new Set((existing ?? []).map((r) => r.phone));

    const rows = contacts
      .filter((c: { name?: string; phone?: string }) => c?.name && (!c.phone || !existingPhones.has(c.phone)))
      .map((c: { name: string; phone?: string }) => ({
        user_id: user.id, name: c.name.trim(), phone: c.phone ? c.phone.trim() : null, source: "contact_sync",
      }));

    if (!rows.length) return Response.json({ ok: true, imported: 0 });
    const { error } = await supabaseAdmin.from("leads").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, imported: rows.length });
  }

  if (action === "delete_lead") {
    const id = body?.id;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    // A lead with a closed sale on record can't be deleted -- same rule as
    // the client-side check, enforced here too since a direct API call
    // could otherwise skip the confirm dialog entirely.
    const { data: closedQuote } = await supabaseAdmin
      .from("recent_quotes")
      .select("id")
      .eq("lead_id", id)
      .eq("user_id", user.id)
      .eq("status", "closed")
      .limit(1);
    if (closedQuote && closedQuote.length) {
      return Response.json({ error: "This lead has a closed sale on record and can't be deleted." }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("leads").delete().eq("id", id).eq("user_id", user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
