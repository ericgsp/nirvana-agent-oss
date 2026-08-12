import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { getUserRole } from "@/lib/supabase/get-role";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const G_DARK = "#075E54";
const G_TEAL = "#128C7E";

export const metadata: Metadata = {
  title: "Sales Agent Assist",
  manifest: "/agent-manifest.json",
  appleWebApp: {
    capable: true,
    title: "Sales Agent Assist",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default async function AgentPage() {
  const role = await getUserRole();
  if (!role) redirect("/login");

  // Single active session check for agents
  if (role === "agent") {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get("agent_device_token")?.value;

    if (!deviceToken) redirect("/login");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: activeSession } = await supabaseAdmin
      .from("active_sessions")
      .select("device_token")
      .eq("user_id", user.id)
      .single();

    if (!activeSession || activeSession.device_token !== deviceToken) {
      redirect("/login?reason=session_replaced");
    }
  }

  const { data } = await supabaseAdmin.rpc("get_distinct_site_codes");
  const sites = ((data ?? []) as string[]).sort();

  return (
    <>
      {/* Paint background immediately — prevents white flash before main stylesheet parses */}
      <style dangerouslySetInnerHTML={{ __html: `html,body{background:#075E54}` }} suppressHydrationWarning />
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100dvh; background: #075E54; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; -webkit-font-smoothing: antialiased; overscroll-behavior: none; }
        #phone { width: 100%; max-width: 430px; height: 100%; margin: 0 auto; background: #f0f2f5; display: flex; flex-direction: column; position: relative; }
        #topbar { background: ${G_DARK}; color: #fff; padding: 10px 14px; display: flex; align-items: center; gap: 10px; z-index: 30; box-shadow: 0 2px 8px rgba(0,0,0,0.25); flex-shrink: 0; }
        #topbar h1 { font-size: 16px; font-weight: 700; flex: 1; }
        #btn-menu { background: none; border: none; color: #fff; cursor: pointer; padding: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px; flex-shrink: 0; touch-action: manipulation; }
        #btn-menu span { display: block; width: 18px; height: 2px; background: #fff; border-radius: 1px; }
        #side-menu-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 90; display: none; }
        #side-menu-backdrop.open { display: block; }
        #side-menu { position: fixed; top: 0; bottom: 0; left: 0; width: 78%; max-width: 300px; background: ${G_DARK}; box-shadow: 4px 0 20px rgba(0,0,0,0.35); z-index: 100; overflow-y: auto; padding-top: 44px; transform: translateX(-100%); transition: transform 0.25s cubic-bezier(0.32,0.72,0,1); }
        #side-menu.open { transform: translateX(0); }
        #side-menu a, #side-menu button.menu-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 16px 18px; color: #fff; text-decoration: none; font-size: 14px; font-weight: 500; background: none; border: none; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); box-sizing: border-box; touch-action: manipulation; }
        #side-menu a:last-child, #side-menu button.menu-item:last-child { border-bottom: none; }
        #side-menu a:active, #side-menu button.menu-item:active { background: rgba(255,255,255,0.12); }
        #side-menu .menu-icon { font-size: 16px; width: 22px; text-align: center; }
        .btn-back { color: #fff; text-decoration: none; font-size: 20px; line-height: 1; }
        .btn-pdf  { padding: 6px 12px; border-radius: 6px; background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.35); font-size: 12px; font-weight: 700; cursor: pointer; touch-action: manipulation; }
        #scroll-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 20px; overscroll-behavior-y: none; }
        /* ── Custom pull-to-refresh (native overscroll stays disabled --
           a real page reload would re-restore the saved session via
           restoreSession() and make the pull look like it did nothing;
           this instead does a full in-app reset, no reload involved).
           Grows in height as the user pulls -- a real flow element, no
           absolute-position/transform tricks needed. ── */
        #pull-refresh-indicator { height: 0; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: ${G_DARK}; color: #fff; }
        #pull-refresh-indicator.pr-anim { transition: height 0.25s ease; }
        #pull-refresh-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; flex-shrink: 0; }
        #pull-refresh-spinner.spin { animation: pull-refresh-spin 0.7s linear infinite; }
        @keyframes pull-refresh-spin { to { transform: rotate(360deg); } }
        #pull-refresh-label { font-size: 10px; font-weight: 700; opacity: 0.85; }
        .tab-panel { display: none; }
        .tab-panel.tab-active { display: block; }
        .tab-placeholder { margin: 40px 20px; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .tab-placeholder .tp-icon { font-size: 30px; }
        .tab-placeholder .tp-title { font-size: 15px; font-weight: 700; color: #475569; }
        .tab-placeholder .tp-sub { font-size: 12px; line-height: 1.5; max-width: 260px; }
        #tab-bar { flex-shrink: 0; display: flex; background: #fff; border-top: 1px solid #e2e8f0; padding: 8px 4px calc(8px + env(safe-area-inset-bottom)); }
        .tab-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; color: #94a3b8; background: none; border: none; padding: 4px 0; cursor: pointer; touch-action: manipulation; }
        .tab-btn.active { color: ${G_TEAL}; }
        .tab-btn-icon { font-size: 18px; line-height: 1; }
        /* Browse is the primary tab (product browsing + quoting) -- raised
           circular badge, like a center FAB, so it reads as the main action. */
        .tab-btn[data-tab="browse"] { font-weight: 800; }
        .tab-btn[data-tab="browse"] .tab-btn-icon { width: 38px; height: 38px; font-size: 20px; display: flex; align-items: center; justify-content: center; margin-top: -16px; border-radius: 50%; background: linear-gradient(135deg, ${G_DARK}, ${G_TEAL}); color: #fff; box-shadow: 0 4px 10px rgba(7,94,84,0.4); }
        .tab-btn[data-tab="browse"].active .tab-btn-icon { box-shadow: 0 4px 14px rgba(7,94,84,0.55); }

        /* ── Home tab ── */
        #home-whats-new-teaser { display: flex; align-items: center; gap: 10px; margin: 8px 10px 0; padding: 10px 13px; background: #FEFCE8; border: 1px solid #FDE047; border-radius: 12px; width: calc(100% - 20px); box-sizing: border-box; cursor: pointer; touch-action: manipulation; text-align: left; }
        .hwn-icon { font-size: 15px; }
        .hwn-body { flex: 1; min-width: 0; }
        .hwn-title { font-size: 12px; font-weight: 800; color: #854D0E; }
        .hwn-sub { font-size: 10.5px; color: #8A6A2E; margin-top: 1px; }
        .hwn-arrow { font-size: 18px; color: #B4922E; }
        #home-goal-card { margin: 10px 10px 0; }
        .home-goal { padding: 16px; border-radius: 16px; color: #fff; background: linear-gradient(150deg, ${G_DARK} 0%, ${G_TEAL} 130%); }
        .home-goal-cap { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.75; font-weight: 700; }
        .home-goal-figs { display: flex; align-items: baseline; gap: 6px; margin-top: 6px; }
        .home-goal-actual { font-size: 22px; font-weight: 700; }
        .home-goal-of { font-size: 12px; opacity: 0.8; }
        .home-goal-track { height: 7px; border-radius: 4px; background: rgba(255,255,255,0.22); margin-top: 12px; overflow: hidden; }
        .home-goal-track > div { height: 100%; background: #fff; border-radius: 4px; }
        .home-stat-row { display: flex; gap: 10px; }
        .home-stat-card { flex: 1; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; text-align: center; }
        .home-stat-num { font-size: 20px; font-weight: 700; color: ${G_DARK}; }
        .home-stat-cap { font-size: 10px; color: #94a3b8; margin-top: 2px; }
        #home-recent-quotes { padding: 0 10px 10px; }
        .home-quote-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 8px; }
        .hqr-main { font-size: 12.5px; font-weight: 700; color: #0f172a; }
        .hqr-sub { font-size: 10.5px; color: #94a3b8; margin-top: 2px; }
        .hqr-total { font-size: 12.5px; font-weight: 700; color: ${G_TEAL}; }
        .home-empty { text-align: center; color: #94a3b8; font-size: 12px; padding: 18px 10px; }

        #team-scope-banner { margin: 10px 10px 0; padding: 10px 14px; border-radius: 12px; background: #f1f5f9; color: #475569; font-size: 11.5px; font-weight: 600; }
        #team-list { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .team-row { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; }
        .team-row-top { display: flex; align-items: center; gap: 8px; }
        .team-tier-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
        .team-row-name { font-size: 13px; font-weight: 700; color: ${G_DARK}; flex: 1; }
        .team-row-code { font-size: 10px; color: #94a3b8; }
        .team-goal-cap { font-size: 10px; color: #94a3b8; margin-top: 8px; }
        .team-goal-figs { display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-top: 2px; }
        .team-goal-track { height: 6px; border-radius: 4px; background: #e2e8f0; margin-top: 6px; overflow: hidden; }
        .team-goal-track > div { height: 100%; background: ${G_TEAL}; border-radius: 4px; }
        .team-no-goal { font-size: 11px; color: #94a3b8; margin-top: 8px; font-style: italic; }

        #me-goal-card { margin: 10px 10px 0; }
        .me-set-goal-btn { display: block; width: 100%; margin-top: 10px; padding: 9px; border-radius: 10px; border: none; background: rgba(255,255,255,0.18); color: #fff; font-size: 12px; font-weight: 700; }
        .me-set-goal-btn-outline { background: transparent; border: 1px solid ${G_TEAL}; color: ${G_TEAL}; margin-top: 8px; }
        .me-goal-btn-row { display: flex; gap: 8px; margin-top: 10px; }
        .me-goal-btn-row .me-set-goal-btn { margin-top: 0; flex: 1; }
        .me-goal-btn-danger { background: rgba(255,255,255,0.10); color: #fecaca; }
        .team-remove-goal-btn { display: block; margin-top: 8px; padding: 5px 0; border: none; background: transparent; color: #b91c1c; font-size: 10.5px; font-weight: 700; text-align: left; }
        #me-team-card { margin: 10px 10px 0; }
        .me-team-card { padding: 14px; border-radius: 16px; background: #fff; border: 1px solid #e2e8f0; }
        .me-team-cap { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; font-weight: 700; }
        .me-team-figs { display: flex; align-items: baseline; gap: 6px; margin-top: 6px; }
        .me-team-actual { font-size: 18px; font-weight: 700; color: ${G_DARK}; }
        .me-team-of { font-size: 12px; color: #94a3b8; }
        .me-team-track { height: 6px; border-radius: 4px; background: #e2e8f0; margin-top: 10px; overflow: hidden; }
        .me-team-track > div { height: 100%; background: ${G_TEAL}; border-radius: 4px; }
        .me-team-note { font-size: 10.5px; color: #94a3b8; margin-top: 6px; }
        #me-quotes-list { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 8px; }
        .me-quote-row { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .mqr-main { font-size: 12.5px; font-weight: 700; color: ${G_DARK}; }
        .mqr-sub { font-size: 10.5px; color: #94a3b8; margin-top: 2px; }
        .mqr-sold-btn { flex-shrink: 0; padding: 6px 12px; border-radius: 999px; border: none; background: ${G_TEAL}; color: #fff; font-size: 11px; font-weight: 700; }
        .mqr-sold-tag { flex-shrink: 0; padding: 5px 10px; border-radius: 999px; background: #dcfce7; color: #15803d; font-size: 10.5px; font-weight: 700; }

        #sold-modal-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1300; align-items:center; justify-content:center; padding:20px; }
        #sold-modal-backdrop.open { display:flex; }
        #sold-modal-box { background:#fff; border-radius:16px; padding:18px; width:100%; max-width:340px; }
        #sold-modal-title { font-size:15px; font-weight:700; color:${G_DARK}; }
        #sold-modal-sub { font-size:11.5px; color:#94a3b8; margin-top:2px; }
        #sold-modal-amount { width:100%; margin-top:6px; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:15px; box-sizing:border-box; }
        #sold-modal-actions { display:flex; gap:8px; margin-top:14px; }
        #sold-modal-actions button { flex:1; padding:10px; border-radius:10px; font-size:13px; font-weight:700; border:none; }
        #sold-modal-cancel { background:#f1f5f9; color:#475569; }
        #sold-modal-confirm { background:${G_TEAL}; color:#fff; }

        #goal-modal-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1300; align-items:center; justify-content:center; padding:20px; }
        #goal-modal-backdrop.open { display:flex; }
        #goal-modal-box { background:#fff; border-radius:16px; padding:18px; width:100%; max-width:340px; }
        #goal-modal-title { font-size:15px; font-weight:700; color:${G_DARK}; }
        #goal-modal-sub { font-size:11.5px; color:#94a3b8; margin-top:2px; }
        #goal-modal-amount { width:100%; margin-top:6px; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:15px; box-sizing:border-box; }
        #goal-modal-actions { display:flex; gap:8px; margin-top:14px; }
        #goal-modal-actions button { flex:1; padding:10px; border-radius:10px; font-size:13px; font-weight:700; border:none; }
        #goal-modal-cancel { background:#f1f5f9; color:#475569; }
        #goal-modal-confirm { background:${G_TEAL}; color:#fff; }
        .team-set-goal-btn { flex-shrink: 0; padding: 4px 10px; border-radius: 999px; border: 1px solid ${G_TEAL}; background: transparent; color: ${G_TEAL}; font-size: 10.5px; font-weight: 700; }
        .avail-banner { display: flex; align-items: center; gap: 10px; margin: 8px 10px 0; padding: 9px 13px; background: linear-gradient(135deg, ${G_DARK} 0%, ${G_TEAL} 100%); border-radius: 12px; box-shadow: 0 2px 6px rgba(7,94,84,0.3); text-decoration: none; cursor: pointer; touch-action: manipulation; -webkit-appearance: none; box-sizing: border-box; width: calc(100% - 20px); }
        .avail-banner:active { opacity: 0.88; }
        .avail-banner-left { flex: 1; }
        .avail-banner-title { font-size: 12px; font-weight: 800; color: #fff; }
        .avail-banner-sub   { font-size: 10px; color: rgba(255,255,255,0.75); margin-top: 2px; }
        .avail-banner-arrow { font-size: 22px; color: rgba(255,255,255,0.6); font-weight: 300; line-height: 1; }
        #btn-challenge { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 10px 0; padding: 9px 13px; background: linear-gradient(135deg, #b45309 0%, #f59e0b 100%); border-radius: 12px; box-shadow: 0 2px 6px rgba(180,83,9,0.35); cursor: pointer; touch-action: manipulation; border: none; box-sizing: border-box; width: calc(100% - 20px); -webkit-appearance: none; }
        #btn-challenge:active { opacity: 0.88; }
        .btn-challenge-left { text-align: center; }
        .btn-challenge-title { font-size: 12px; font-weight: 800; color: #fff; }
        .btn-challenge-sub   { font-size: 10px; color: rgba(255,255,255,0.85); margin-top: 2px; }
        .btn-challenge-arrow { font-size: 22px; color: rgba(255,255,255,0.6); font-weight: 300; line-height: 1; }
        .s-card  { margin: 10px 10px 0; background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .s-label { display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-bottom: 1px solid #f0f2f5; }
        .s-dot   { width: 22px; height: 22px; border-radius: 50%; background: ${G_DARK}; color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .s-title { font-size: 13px; font-weight: 700; color: #0f172a; flex: 1; }
        .s-sub   { font-size: 11px; color: #94a3b8; }
        .btn-reset { margin-left: auto; font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px 10px; cursor: pointer; touch-action: manipulation; }
        .btn-reset:active { background: #e2e8f0; }
        #zone-filter { padding: 12px 14px; display: flex; gap: 10px; overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
        .f-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .f-lbl  { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .f-sel  { width: 100%; height: 44px; padding: 0 28px 0 10px; border-radius: 9px; border: 1.5px solid #e2e8f0; font-size: 14px; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center; color: #0f172a; cursor: pointer; -webkit-appearance: none; appearance: none; }
        .f-sel:disabled { background-color: #f8fafc; color: #cbd5e1; cursor: default; }
        .f-dd { position: relative; width: 100%; }
        .f-dd-trigger { width: 100%; height: 44px; padding: 0 28px 0 10px; border-radius: 9px; border: 1.5px solid #e2e8f0; font-size: 14px; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center; color: #0f172a; cursor: pointer; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .f-dd-trigger.placeholder { color: #94a3b8; }
        .f-dd-trigger:disabled { background-color: #f8fafc; color: #cbd5e1; cursor: default; }
        .f-dd-panel { position: fixed; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 9px; z-index: 2000; max-height: 55vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15); min-width: 180px; }
        /* Quick Select stepper rows — card style matching the approved preview */
        .f-dd-cat { margin: 0 12px 8px; padding: 11px 14px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; user-select: none; }
        .f-dd-cat:active { background: #f1f5f9; }
        .f-dd-cat-open { background: #eef2ff; color: #0f172a; border-color: ${G_TEAL}; }
        .f-dd-zone { margin: 0 12px 8px; padding: 13px 14px; font-size: 14px; font-weight: 700; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #f8fafc; border: 1.5px solid transparent; border-radius: 13px; }
        .f-dd-zone:active { border-color: ${G_TEAL}; }
        .f-dd-zone-sel { background: #f0fdfa; border-color: ${G_TEAL}; }
        .f-dd-zone-name { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
        .f-dd-zone-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .f-dd-zone-chev { color: #94a3b8; font-size: 15px; }
        .f-dd-avail { font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #dcfce7; color: #15803d; white-space: nowrap; }
        .f-dd-avail-low { background: #fef3c7; color: #92400e; }
        .f-dd-badge { font-size: 10px; background: #dbeafe; color: #1d4ed8; border-radius: 4px; padding: 1px 5px; font-weight: 600; flex-shrink: 0; }
        .f-dd-badge-amber { font-size: 10px; background: #fef3c7; color: #92400e; border-radius: 4px; padding: 1px 5px; font-weight: 600; flex-shrink: 0; }
        .f-dd-badge-green { font-size: 10px; background: #dcfce7; color: #166534; border-radius: 4px; padding: 1px 5px; font-weight: 600; flex-shrink: 0; }
        .bs-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; cursor: pointer; }
        .bs-sheet    { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-radius: 18px 18px 0 0; z-index: 1001; max-height: 60vh; display: flex; flex-direction: column; }
        .bs-handle   { width: 36px; height: 4px; background: #cbd5e1; border-radius: 2px; margin: 10px auto 4px; flex-shrink: 0; }
        .bs-title    { font-size: 13px; font-weight: 700; color: #64748b; text-align: center; padding: 4px 0 10px; flex-shrink: 0; border-bottom: 1px solid #f1f5f9; }
        .bs-list     { overflow-y: auto; flex: 1; }
        .bs-opt      { display: block; width: 100%; padding: 15px 20px; text-align: left; background: none; border: none; font-size: 16px; color: #0f172a; cursor: pointer; touch-action: manipulation; border-bottom: 1px solid #f8fafc; }
        .bs-opt:active  { background: #f0fdf4; }
        .bs-opt.selected { color: ${G_DARK}; font-weight: 700; }
        #layout-area { padding: 0; }
        .layout-placeholder { margin: 12px; min-height: 150px; border: 2px dashed #e2e8f0; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #94a3b8; background: #fafbfc; text-align: center; padding: 20px; }
        .lp-icon  { font-size: 32px; }
        .lp-title { font-size: 13px; font-weight: 600; color: #64748b; }
        .lp-sub   { font-size: 11px; line-height: 1.5; }
        .legend   { display: flex; gap: 12px; padding: 8px 12px 6px; border-bottom: 1px solid #f0f2f5; }
        .leg-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #64748b; }
        .leg-dot  { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
        .selected-bar { padding: 6px 12px 4px; display: flex; flex-wrap: wrap; gap: 5px; border-bottom: 1px solid #f0f2f5; background: #f8fafc; }
        .sel-chip { display: inline-flex; align-items: center; gap: 4px; background: #1a3a6b; color: #fff; border-radius: 999px; padding: 3px 8px 3px 10px; font-size: 10px; font-weight: 700; cursor: pointer; }
        .sel-chip-x { font-size: 13px; line-height: 1; opacity: 0.7; }
        .sel-chip:active { opacity: 0.75; }
        .zone-label { padding: 5px 12px; background: #f8fafc; border-top: 1px solid #f0f2f5; font-size: 11px; font-weight: 700; color: #64748b; }
        #layout-card { max-height: 340px; overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: manipulation; }
        .portal-scroll { overflow-x: auto; overflow-y: visible; -webkit-overflow-scrolling: touch; padding: 6px 0 8px; }
        .nz-avail    { background: #22c55e !important; color: #000 !important; font-size: 9px !important; font-weight: 700 !important; cursor: pointer !important; padding: 4px 3px !important; min-width: 68px !important; white-space: nowrap !important; user-select: none; touch-action: manipulation; vertical-align: middle !important; }
        .nz-avail:active { opacity: 0.75 !important; }
        .nz-avail.nz-promo-customer { box-shadow: inset 0 0 0 3px #f59e0b !important; }
        .nz-avail.nz-promo-drplus   { box-shadow: inset 0 0 0 3px #3b82f6 !important; }
        .nz-avail.nz-promo-central  { box-shadow: inset 0 0 0 3px #14b8a6 !important; }
        .nz-avail.nz-promo-asneed   { box-shadow: inset 0 0 0 3px #a855f7 !important; }
        .nz-sold     { background: #f1f5f9 !important; color: #334155 !important; font-size: 9px !important; padding: 4px 3px !important; min-width: 68px !important; white-space: nowrap !important; cursor: default !important; vertical-align: middle !important; }
        .nz-filtered { background: #f1f5f9 !important; color: #cbd5e1 !important; font-size: 9px !important; padding: 4px 3px !important; min-width: 68px !important; white-space: nowrap !important; cursor: default !important; vertical-align: middle !important; border-color: #e2e8f0 !important; }
        .filter-nav { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#f0fdfa; border:1.5px solid #a7f3d0; border-radius:10px; margin:8px 0 4px; }
        .fn-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid #a7f3d0; background:#fff; font-size:18px; font-weight:700; color:#075E54; cursor:pointer; touch-action:manipulation; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .fn-btn:active { background:#ccfbf1; }
        #fn-count { flex:1; text-align:center; font-size:12px; font-weight:700; color:#065f46; }
        .fn-clear { font-size:11px; color:#64748b; background:none; border:none; cursor:pointer; white-space:nowrap; text-decoration:underline; padding:0; }
        @keyframes nz-pulse-anim { 0%,100%{outline-color:#f59e0b} 50%{outline-color:#ef4444} }
        .nz-pulse { outline:3px solid #f59e0b !important; outline-offset:-2px !important; animation:nz-pulse-anim 0.4s ease 2; }
        .nz-selected { background: #1a3a6b !important; color: #fff !important; font-size: 9px !important; font-weight: 700 !important; padding: 4px 3px !important; min-width: 68px !important; cursor: pointer !important; outline: 3px solid #facc15 !important; outline-offset: -2px !important; vertical-align: middle !important; }
        .nz-gap      { background: #e2e8f0 !important; min-width: 20px !important; }
        .nz-label    { background: #fff !important; font-size: 10px !important; font-weight: 600 !important; color: #334155 !important; white-space: nowrap !important; padding: 3px 6px !important; }
        .nz-empty    { background: #fff !important; min-width: 8px !important; padding: 0 !important; }
        .nz-wall-gap td { height: 14px !important; background: #f0f2f5 !important; padding: 0 !important; border: none !important; }
        .nz-wall-header td { padding: 0 !important; border: none !important; }
        .nz-wall-header td.nz-wall-cell { background: ${G_DARK} !important; padding: 5px 10px !important; text-align: left !important; }
        .nz-wall-cell .nz-wall-stat { margin-left: 10px; }
        .nz-wall-name { font-size: 11px !important; font-weight: 800 !important; color: #fff !important; letter-spacing: 0.04em !important; white-space: nowrap !important; }
        .nz-wall-stat { font-size: 10px !important; color: rgba(255,255,255,0.75) !important; white-space: nowrap !important; }
        .nirvana-zone-layout table { border-collapse: collapse; }
        .nirvana-zone-layout td { border: 1px solid #e2e8f0 !important; text-align: center !important; vertical-align: middle !important; }
        /* ── Layout mode toggle ── */
        .layout-toggle { display:flex; gap:6px; padding:8px 12px; border-bottom:1px solid #f0f2f5; background:#f8fafc; }
        .lt-btn { flex:1; padding:7px 10px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; font-size:12px; font-weight:700; color:#64748b; cursor:pointer; touch-action:manipulation; text-align:center; }
        .lt-btn.on { background:${G_DARK}; border-color:${G_DARK}; color:#fff; }
        .lt-btn:active { opacity:0.8; }
        /* ── Promo cards ── */
        #promo-view { padding:10px 12px; display:flex; flex-direction:column; gap:8px; }
        .promo-group-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin-top:4px; }
        .promo-card { border:1.5px solid #e2e8f0; border-radius:12px; background:#fff; overflow:hidden; cursor:pointer; }
        .promo-card.has-promo { border-color:#dc2626; }
        .promo-card:active { opacity:0.8; }
        .promo-card-top { padding:11px 13px; display:flex; align-items:flex-start; gap:10px; }
        .promo-card-info { flex:1; min-width:0; }
        .promo-card-section { font-size:13px; font-weight:800; color:#0f172a; }
        .promo-card-levels { font-size:11px; color:#64748b; margin-top:2px; }
        .promo-card-price { font-size:11px; color:#16a34a; font-weight:700; margin-top:2px; }
        .promo-card-right { flex-shrink:0; text-align:right; }
        .promo-card-count { font-size:15px; font-weight:800; color:#16a34a; }
        .promo-card-avail { font-size:10px; color:#94a3b8; }
        .promo-badge-bar { background:#dc2626; padding:5px 13px; display:flex; align-items:center; justify-content:space-between; }
        .promo-badge-name { font-size:11px; font-weight:700; color:#fff; }
        .promo-badge-disc { font-size:11px; font-weight:800; color:#fff; }
        .promo-loading { padding:24px; text-align:center; font-size:12px; color:#94a3b8; }
        .promo-section-list { font-size:11px; color:#475569; line-height:1.5; margin-top:2px; word-break:break-word; }
        .promo-loading-progress { display:flex; flex-direction:column; align-items:center; gap:8px; padding:32px 24px; }
        .promo-fetch-icon { font-size:28px; line-height:1; }
        .promo-fetch-label { font-size:13px; color:#475569; font-weight:500; }
        .promo-fetch-bar-wrap { width:200px; height:6px; background:#e2e8f0; border-radius:999px; overflow:hidden; }
        .promo-fetch-bar { height:100%; background:#075E54; border-radius:999px; transition:width 0.3s ease; min-width:6px; }
        .promo-fetch-count { font-size:11px; color:#94a3b8; }
        #quote-section { margin: 10px 10px 0; }
        .quote-empty { padding: 36px 20px; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .qe-icon { font-size: 32px; }
        .qe-msg  { font-size: 13px; line-height: 1.5; }
        #dp-strip { padding: 9px 14px; background: #f8fafc; border-bottom: 1px solid #f0f2f5; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        #dp-strip .lbl { font-size: 11px; font-weight: 700; color: #64748b; white-space: nowrap; }
        .dp-pill      { padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid #e2e8f0; cursor: pointer; background: #fff; color: #334155; }
        .dp-pill.on   { background: ${G_TEAL}; border-color: ${G_TEAL}; color: #fff; }
        .dp-asneed    { border-color: #f59e0b; color: #92400e; }
        .dp-asneed.on { background: #f59e0b; border-color: #f59e0b; color: #fff; }
        .promo-collapse       { border-bottom: 1px solid #fde68a; }
        .promo-collapse-header{ padding: 5px 14px; background: #fffbeb; font-size: 10px; font-weight: 600; color: #78350f; cursor: pointer; user-select: none; display: flex; align-items: center; gap: 6px; }
        .promo-collapse-header:hover { background: #fef3c7; }
        .promo-collapse-arrow { margin-left: auto; font-size: 9px; }
        .promo-note         { padding: 5px 14px; background: #fffbeb; border-top: 1px solid #fde68a; font-size: 10px; font-weight: 600; color: #78350f; }
        .promo-note-instant { background: #eff6ff; border-bottom: 1px solid #bfdbfe; border-top: none; color: #1e40af; }
        #quote-section { overflow: hidden; }
        .qt-header { padding: 16px 14px 12px; text-align: center; border-bottom: 2px solid #1a3a6b; }
        .qt-header .h-brand    { font-size: 17px; font-weight: 700; color: #1a3a6b; letter-spacing: -0.01em; }
        .qt-header .h-site-zh  { font-size: 14px; color: #0f172a; margin-top: 1px; }
        .qt-header .h-product  { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 6px; }
        .qt-header .h-lot      { font-size: 13px; font-weight: 700; color: #1a3a6b; margin-top: 2px; }
        .qt-header .h-category { font-size: 13px; color: #0f172a; margin-top: 1px; }
        .qt-header .h-size     { font-size: 12px; color: #0f172a; margin-top: 1px; }
        .qt-header .h-section  { font-size: 14px; font-weight: 700; color: #dc2626; margin-top: 4px; }
        .qt-header .h-promo-badge { display: inline-flex; align-items: center; justify-content: center; margin-top: 6px; background: #dc2626; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 10px; border-radius: 999px; line-height: 1.4; }
        .qt-header .h-info { font-size: 12px; color: #475569; margin-top: 5px; }
        .n3-condition { background: #fef3c7; border-left: 4px solid #d97706; padding: 8px 12px; margin: 0; font-size: 13px; color: #92400e; }
        .qt-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .qt { width: 100%; border-collapse: collapse; font-size: 13px; }
        .qt td, .qt th { border: 1px solid #b0b8c1; padding: 7px 10px; white-space: nowrap; vertical-align: middle; line-height: 1.3; }
        .qt tbody tr td:first-child  { border-right: none; }
        .qt tbody tr td:nth-child(2) { border-left: none; border-right: 2px solid #1a3a6b; }
        .qt thead th { background: #1a3a6b; color: #fff; text-align: center; font-weight: 700; font-size: 12px; letter-spacing: 0.01em; }
        .qt thead th.tc-lbl { text-align: left; min-width: 135px; }
        .qt thead th.tc-zh  { text-align: left; min-width: 95px; }
        .qt thead th.tc-val { min-width: 65px; }
        .qt tbody td { background: #fff; color: #0f172a; vertical-align: middle; }
        .qt tbody td.tv { text-align: center; font-variant-numeric: tabular-nums; }
        .qt tr.tbold td   { font-weight: 700; }
        .qt tr.tinfo td   { background: #f8fafc; font-size: 12px; color: #0f172a; }
        .qt tr.tinfo td.tv { color: #0f172a; font-weight: 600; }
        .qt tr.col-toggle-row th { background: #dbeafe; border-bottom: 1px solid #93c5fd; }
        .qt tr.tsection-hdr td { background: #1e3a6b; color: #fff; font-size: 11px; font-weight: 700; padding: 5px 10px; letter-spacing: 0.06em; text-transform: uppercase; border: none; border-right: 1px solid rgba(255,255,255,0.3); }
        .qt tr.tpnp td    { background: #fef9c3; }
        .qt tr.tinst td   { background: #dbeafe; }
        .qt tr.tred td    { color: #dc2626; font-weight: 700; }
        .qt tr.ttenure td { background: #c6efce; color: #0f172a; font-weight: 700; }
        .qt tr.tnet-rule td { background: #fff; height: 3px; padding: 0; border: none; }
        .qt tr.tnet td  { background: #1a3a6b; color: #fff; font-weight: 700; font-size: 14px; border-color: rgba(255,255,255,0.4); }
        @media screen { .qt tr.tnet td { box-shadow: inset 0 2px 0 ${G_TEAL}; } }
        .qt tr.tnet td.tv { border-left: 3px solid #fff; }
        .qt tr.tdr td  { background: #ffeb9c; color: #9c5700; font-weight: 700; }
        .qt tr.tsep td { background: #f8fafc; border: none; height: 4px; padding: 0; }
        .qt-footer { padding: 12px 14px 16px; font-size: 11.5px; color: #334155; border-top: 2px solid #1a3a6b; }
        .qt-footer p { margin: 2px 0; line-height: 1.5; }
        .qt-footer .f-valid { font-weight: 700; margin-bottom: 4px; }
        .wm-wrap  { display: none; position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='120'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' transform='rotate(-35 110 60)' font-family='Arial,sans-serif' font-size='22' font-weight='900' letter-spacing='3' fill='rgba(26%2C58%2C107%2C0.07)' text-decoration='none'%3EBDD1228%3C/text%3E%3C/svg%3E"); background-repeat: repeat; }
        .wm-text  { display: none; }
        #print-footer { display: none; }
        /* ── Memo drawer ── */
        /* ── Quick Select stepper (Site → Zone) — full-screen, one step at a
           time, instead of two separate small bottom drawers ── */
        #qs-stepper { position:fixed; inset:0; background:#f0f2f5; z-index:1150; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        #qs-stepper.open { transform:translateY(0); }
        #qs-stepper-topbar { display:flex; align-items:center; gap:10px; padding:14px 14px 10px; background:${G_DARK}; color:#fff; flex-shrink:0; }
        #qs-stepper-back, #qs-stepper-close { width:30px; height:30px; border-radius:50%; border:none; background:rgba(255,255,255,0.18); color:#fff; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; touch-action:manipulation; }
        #qs-stepper-title-wrap { flex:1; min-width:0; }
        #qs-stepper-step-count { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; opacity:0.75; }
        #qs-stepper-title { font-size:15px; font-weight:800; margin:1px 0 0; }
        #qs-stepper-dots { display:flex; gap:5px; padding:12px 16px 4px; flex-shrink:0; background:#f0f2f5; }
        .qs-dot { flex:1; height:4px; border-radius:99px; background:#e2e8f0; transition:background 0.2s; }
        .qs-dot.done { background:#25D366; }
        .qs-dot.now { background:${G_DARK}; }
        #qs-stepper-body { flex:1; overflow-y:auto; padding:10px 0 32px; }
        .qs-step-panel { padding:0; }
        /* Filter Products stepper — same shell as Quick Select's, reused under
           its own ids since the two overlays are visually independent but can
           follow each other in a session (Quick Select never covers Filter). */
        #filter-stepper { position:fixed; inset:0; background:#f0f2f5; z-index:1150; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        #filter-stepper.open { transform:translateY(0); }
        #filter-stepper-topbar { display:flex; align-items:center; gap:10px; padding:14px 14px 10px; background:${G_DARK}; color:#fff; flex-shrink:0; }
        #filter-stepper-back, #filter-stepper-close { width:30px; height:30px; border-radius:50%; border:none; background:rgba(255,255,255,0.18); color:#fff; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; touch-action:manipulation; }
        #filter-stepper-title-wrap { flex:1; min-width:0; }
        #filter-stepper-step-count { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; opacity:0.75; }
        #filter-stepper-title { font-size:15px; font-weight:800; margin:1px 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        #filter-stepper-dots { display:flex; gap:5px; padding:12px 16px 4px; flex-shrink:0; background:#f0f2f5; }
        #filter-stepper-body { flex:1; overflow-y:auto; }
        /* Only the deepest/last card (the current step) is visible at once —
           renderDrawer()'s existing per-step .ad-card HTML is unchanged. */
        #filter-stepper-body .ad-card { display:none; margin-top:0 !important; }
        #filter-stepper-body .ad-card:last-of-type { display:block; }
        #filter-stepper-body .ad-dot { display:none; }

        #memo-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1100; }
        #memo-backdrop.open { display:block; }
        #memo-drawer { position:fixed; left:0; right:0; bottom:0; background:#f0f2f5; border-radius:20px 20px 0 0; z-index:1101; max-height:80vh; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        #memo-drawer.open { transform:translateY(0); }
        #memo-drawer-handle { width:36px; height:4px; background:#cbd5e1; border-radius:2px; margin:12px auto 0; flex-shrink:0; }
        #memo-drawer-topbar { display:flex; align-items:center; padding:10px 14px 12px; flex-shrink:0; border-bottom:1px solid #e2e8f0; }
        #memo-drawer-topbar h2 { font-size:15px; font-weight:800; color:#0f172a; flex:1; }
        #memo-drawer-close { font-size:22px; line-height:1; color:#94a3b8; background:none; border:none; cursor:pointer; padding:4px; }
        #memo-tabs { display:flex; gap:8px; padding:10px 14px; flex-shrink:0; border-bottom:1px solid #e2e8f0; }
        .memo-tab { flex:1; padding:8px 0; border-radius:8px; border:none; font-size:13px; font-weight:700; cursor:pointer; background:#e2e8f0; color:#64748b; }
        .memo-tab.active { background:#0f172a; color:#fff; }
        #memo-scroll { flex:1; overflow-y:auto; padding:8px 0 32px; }
        .memo-panel { display:none; }
        .memo-panel.active { display:block; }
        .memo-item { display:flex; align-items:center; gap:12px; padding:14px 18px; text-decoration:none; border-bottom:1px solid #e2e8f0; color:#0f172a; }
        .memo-item:active { background:#e2e8f0; }
        .memo-item-icon { font-size:20px; flex-shrink:0; }
        .memo-item-body { flex:1; min-width:0; }
        .memo-item-title { font-size:13px; font-weight:700; }
        .memo-item-sub { font-size:11px; color:#64748b; margin-top:2px; }
        .memo-item-arrow { color:#94a3b8; font-size:16px; flex-shrink:0; }
        /* ── Forms drawer ── */
        #forms-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1100; }
        #forms-backdrop.open { display:block; }
        #forms-drawer { position:fixed; left:0; right:0; bottom:0; background:#f0f2f5; border-radius:20px 20px 0 0; z-index:1101; max-height:80vh; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        #forms-drawer.open { transform:translateY(0); }
        #forms-drawer-handle { width:36px; height:4px; background:#cbd5e1; border-radius:2px; margin:12px auto 0; flex-shrink:0; }
        #forms-drawer-topbar { display:flex; align-items:center; padding:10px 14px 12px; flex-shrink:0; border-bottom:1px solid #e2e8f0; }
        #forms-drawer-topbar h2 { font-size:15px; font-weight:800; color:#0f172a; flex:1; }
        #forms-drawer-close { font-size:22px; line-height:1; color:#94a3b8; background:none; border:none; cursor:pointer; padding:4px; }
        #forms-scroll { flex:1; overflow-y:auto; padding:8px 0 32px; }
        /* ── Sites drawer ── */
        #sites-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1100; }
        #sites-backdrop.open { display:block; }
        #sites-drawer { position:fixed; left:0; right:0; bottom:0; background:#f0f2f5; border-radius:20px 20px 0 0; z-index:1101; max-height:85vh; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        #sites-drawer.open { transform:translateY(0); }
        #sites-drawer-handle { width:36px; height:4px; background:#cbd5e1; border-radius:2px; margin:12px auto 0; flex-shrink:0; }
        #sites-drawer-topbar { display:flex; align-items:center; padding:10px 14px 12px; flex-shrink:0; border-bottom:1px solid #e2e8f0; }
        #sites-drawer-topbar h2 { font-size:15px; font-weight:800; color:#0f172a; flex:1; }
        #sites-drawer-close { font-size:22px; line-height:1; color:#94a3b8; background:none; border:none; cursor:pointer; padding:4px; }
        #sites-scroll { flex:1; overflow-y:auto; padding:8px 0 32px; }
        .site-card { padding:14px 18px; border-bottom:1px solid #e2e8f0; }
        .site-card-name { font-size:13px; font-weight:700; color:#0f172a; margin-bottom:4px; }
        .site-card-addr { font-size:11px; color:#64748b; line-height:1.5; margin-bottom:6px; }
        .site-card-phones { display:flex; flex-wrap:wrap; gap:6px; }
        .site-card-tel { display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; color:#075E54; background:#e6f4f1; border-radius:6px; padding:4px 10px; text-decoration:none; }
        .site-card-tel:active { background:#c8e6e1; }
        /* ── Training & Event drawer ── */
        #announcement-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1100; }
        #announcement-backdrop.open { display:block; }
        #announcement-drawer { position:fixed; left:0; right:0; bottom:0; background:#f0f2f5; border-radius:20px 20px 0 0; z-index:1101; max-height:85vh; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        #announcement-drawer.open { transform:translateY(0); }
        #announcement-drawer-handle { width:36px; height:4px; background:#cbd5e1; border-radius:2px; margin:12px auto 0; flex-shrink:0; }
        #announcement-drawer-topbar { display:flex; align-items:center; padding:10px 14px 12px; flex-shrink:0; border-bottom:1px solid #e2e8f0; }
        #announcement-drawer-topbar h2 { font-size:15px; font-weight:800; color:#0f172a; flex:1; }
        #announcement-drawer-close { font-size:22px; line-height:1; color:#94a3b8; background:none; border:none; cursor:pointer; padding:4px; }
        #announcement-scroll { flex:1; overflow-y:auto; padding-bottom:32px; }
        .edm-poster-wrap { position:relative; margin-bottom:10px; }
        .edm-poster-img { width:100%; border-radius:10px; display:block; box-shadow:0 1px 4px rgba(0,0,0,0.12); cursor:pointer; }
        .menu-badge { margin-left:8px; background:#dc2626; color:#fff; font-size:9px; font-weight:800; padding:2px 6px; border-radius:10px; letter-spacing:0.05em; vertical-align:middle; }
        .edm-wa-btn { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; margin-top:6px; padding:8px 0; background:#25D366; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; text-decoration:none; }
        .ap-photo-item { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
        .print-only { display: none; }
        .ap-folder { margin-bottom:6px; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; }
        .ap-folder-header { display:flex; align-items:center; gap:8px; padding:10px 12px; background:#f8fafc; cursor:pointer; user-select:none; }
        .ap-folder-icon { font-size:18px; }
        .ap-folder-name { font-size:13px; font-weight:700; color:#0f172a; flex:1; }
        .ap-folder-count { font-size:11px; color:#94a3b8; }
        .ap-folder-arrow { font-size:12px; color:#64748b; }
        .ap-folder-body { padding:10px; background:#fff; }
        @media (prefers-color-scheme:dark) {
          .ap-folder { border-color:#334155; }
          .ap-folder-header { background:#1e293b; }
          .ap-folder-name { color:#f1f5f9; }
          .ap-folder-body { background:#0f172a; }
        }
        .ap-dl-btn { display:block; text-align:center; padding:7px 0; background:#0f172a; color:#fff; border-radius:8px; font-size:12px; font-weight:700; text-decoration:none; }
        #training-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1100; }
        #training-backdrop.open { display:block; }
        #training-drawer { position:fixed; left:0; right:0; bottom:0; background:#f0f2f5; border-radius:20px 20px 0 0; z-index:1101; max-height:80vh; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        #training-drawer.open { transform:translateY(0); }
        #training-drawer-handle { width:36px; height:4px; background:#cbd5e1; border-radius:2px; margin:12px auto 0; flex-shrink:0; }
        #training-drawer-topbar { display:flex; align-items:center; padding:10px 14px 12px; flex-shrink:0; border-bottom:1px solid #e2e8f0; }
        #training-drawer-topbar h2 { font-size:15px; font-weight:800; color:#0f172a; flex:1; }
        #training-drawer-close { font-size:22px; line-height:1; color:#94a3b8; background:none; border:none; cursor:pointer; padding:4px; }
        #training-scroll { flex:1; overflow-y:auto; padding:8px 0 32px; }
        /* mini calendar */
        .evt-cal { padding:12px 14px 0; }
        .evt-cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .evt-cal-title { font-size:13px; font-weight:800; color:#0f172a; }
        .evt-cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; text-align:center; }
        .evt-cal-day-name { font-size:10px; color:#94a3b8; font-weight:600; padding:2px 0; }
        .evt-cal-day { font-size:11px; padding:5px 2px; border-radius:6px; color:#475569; cursor:default; position:relative; }
        .evt-cal-day.has-event { background:#075E54; color:#fff; font-weight:700; cursor:pointer; }
        .evt-cal-day.today { outline:2px solid #075E54; outline-offset:-2px; }
        .evt-cal-day.other-month { color:#cbd5e1; }
        /* calendar legend */
        .evt-legend { padding:10px 14px 14px; display:flex; flex-direction:column; gap:6px; }
        .evt-legend-item { display:flex; align-items:flex-start; gap:8px; font-size:11px; color:#475569; }
        .evt-legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:2px; }
        .evt-legend-label { line-height:1.4; }
        .evt-legend-dates { font-weight:700; color:#075E54; }
        /* event picker (multiple events on same date) */
        #evt-picker-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:1200; align-items:flex-end; justify-content:center; padding-bottom:40px; }
        #evt-picker-backdrop.open { display:flex; }
        #evt-picker-box { background:#fff; border-radius:16px; width:calc(100% - 40px); max-width:390px; overflow:hidden; }
        #evt-picker-title { font-size:13px; font-weight:700; color:#64748b; padding:14px 16px 10px; border-bottom:1px solid #e2e8f0; }
        #evt-picker-list { padding:6px 0; }
        .evt-picker-item { display:flex; align-items:center; gap:12px; padding:13px 16px; cursor:pointer; }
        .evt-picker-item:active { background:#f1f5f9; }
        .evt-picker-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .evt-picker-title { font-size:13px; font-weight:600; color:#0f172a; }
        /* poster modal */
        #poster-modal-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:1200; flex-direction:column; align-items:center; justify-content:center; padding:20px; gap:14px; }
        #poster-modal-backdrop.open { display:flex; }
        #poster-modal-img { max-width:100%; max-height:75vh; border-radius:10px; object-fit:contain; }
        #poster-modal-close { position:absolute; top:16px; right:16px; font-size:28px; color:#fff; background:rgba(0,0,0,0.5); border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; }
        #poster-modal-notice { background:rgba(255,255,255,0.15); color:#fff; font-size:13px; font-weight:600; border-radius:8px; padding:10px 18px; text-align:center; border:1px solid rgba(255,255,255,0.3); }
        /* ── Monthly Challenge drawer ── */
        #challenge-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1100; }
        #challenge-backdrop.open { display:block; }
        #challenge-drawer { position:fixed; left:0; right:0; bottom:0; background:#f0f2f5; border-radius:20px 20px 0 0; z-index:1101; max-height:80vh; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        #challenge-drawer.open { transform:translateY(0); }
        #challenge-drawer-handle { width:36px; height:4px; background:#cbd5e1; border-radius:2px; margin:12px auto 0; flex-shrink:0; }
        #challenge-drawer-topbar { display:flex; align-items:center; padding:10px 14px 12px; flex-shrink:0; border-bottom:1px solid #e2e8f0; }
        #challenge-drawer-topbar h2 { font-size:15px; font-weight:800; color:#0f172a; flex:1; }
        #challenge-drawer-close { font-size:22px; line-height:1; color:#94a3b8; background:none; border:none; cursor:pointer; padding:4px; }
        #challenge-scroll { flex:1; overflow-y:auto; padding:8px 0 32px; }
        .drawer-placeholder { padding:40px 20px; text-align:center; color:#94a3b8; font-size:13px; }
        /* ── Inventory tab: product list ↔ layout view ── */
        #avail-scroll { padding-bottom:20px; }
        #btn-inventory-back { display:flex; align-items:center; gap:6px; margin:10px 10px 0; padding:9px 13px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; font-size:13px; font-weight:700; color:${G_DARK}; cursor:pointer; touch-action:manipulation; }
        /* ── Browse: sticky total bar (Inventory + Quote combined) ── */
        #browse-stickybar { position:sticky; bottom:0; z-index:20; background:#fff; border-top:1px solid #e2e8f0; padding:10px 14px; display:flex; align-items:center; gap:12px; box-shadow:0 -6px 16px -10px rgba(0,0,0,0.15); }
        #browse-sticky-info { flex:1; min-width:0; }
        #browse-sticky-count { font-size:11px; color:#94a3b8; }
        #browse-sticky-total { font-size:16px; font-weight:800; color:${G_DARK}; }
        #browse-sticky-print { flex-shrink:0; background:#25D366; color:#04351f; border:none; border-radius:10px; padding:10px 18px; font-size:13px; font-weight:800; cursor:pointer; touch-action:manipulation; }
        .ad-card { margin:0 10px 10px; background:#fff; border-radius:14px; box-shadow:0 1px 4px rgba(0,0,0,0.08); overflow:hidden; }
        .ad-label { display:flex; align-items:center; gap:9px; padding:10px 14px; border-bottom:1px solid #f0f2f5; }
        .ad-dot { width:22px; height:22px; border-radius:50%; background:${G_DARK}; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ad-title { font-size:13px; font-weight:700; color:#0f172a; flex:1; }
        .ad-sub { font-size:11px; color:#94a3b8; }
        .ad-body { padding:12px 14px; }
        /* Swipeable carousels -- scroll-snap so a swipe settles on one chip/card
           at a time instead of free-scrolling past it. */
        .ad-chips { display:flex; gap:7px; flex-wrap:nowrap; overflow-x:auto; scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch; padding-bottom:2px; }
        .ad-chips::-webkit-scrollbar { display:none; }
        .ad-chip { flex-shrink:0; scroll-snap-align:start; padding:9px 15px; border-radius:22px; border:1.5px solid #e2e8f0; background:#f8fafc; font-size:13px; font-weight:600; color:#475569; cursor:pointer; display:flex; align-items:center; gap:7px; }
        .ad-chip.on { background:${G_DARK}; border-color:${G_DARK}; color:#fff; }
        .ad-chip:active { opacity:0.75; }
        .ad-chip-count { font-size:10px; font-weight:700; padding:1px 6px; border-radius:999px; background:#e2e8f0; color:#64748b; }
        .ad-chip.on .ad-chip-count { background:rgba(255,255,255,0.25); color:#fff; }
        .ad-sites { display:flex; gap:8px; flex-wrap:nowrap; overflow-x:auto; scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch; padding-bottom:2px; }
        .ad-sites::-webkit-scrollbar { display:none; }
        .ad-site { flex:0 0 62%; scroll-snap-align:start; border:1.5px solid #e2e8f0; border-radius:11px; padding:11px 13px; background:#f8fafc; cursor:pointer; }
        .ad-site.on { border-color:${G_TEAL}; background:#f0fdfa; }
        .ad-site:active { opacity:0.75; }
        .ad-site-name { font-size:13px; font-weight:700; color:#0f172a; }
        .ad-site-count { font-size:11px; color:#16a34a; font-weight:600; margin-top:3px; }
        /* ── Quick Select banner — single entry point opening the
           full-screen Site → Zone → Section stepper ── */
        .qs-card { margin:10px 10px 0; }
        .qs-banner { width:100%; display:flex; align-items:center; gap:12px; background:linear-gradient(135deg, ${G_DARK}, ${G_TEAL}); border:none; border-radius:14px; padding:13px 14px; text-align:left; }
        .qs-banner-icon { width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; font-size:16px; color:#fff; flex-shrink:0; }
        .qs-banner-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
        .qs-banner-title { font-size:13.5px; font-weight:800; color:#fff; }
        .qs-banner-sub { font-size:11px; font-weight:600; color:rgba(255,255,255,0.8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .qs-banner-chev { color:rgba(255,255,255,0.7); font-size:20px; flex-shrink:0; }
        /* Confirm / skip step (Section step, when N/A or as a bottom action) */
        .qs-confirm-note { margin:0 12px 12px; padding:24px 18px; text-align:center; font-size:13px; color:#64748b; background:#f8fafc; border:1.5px dashed #e2e8f0; border-radius:14px; }
        .qs-confirm-cta { display:block; width:calc(100% - 24px); margin:8px 12px 0; padding:13px; border-radius:13px; border:none; background:${G_DARK}; color:#fff; font-size:13.5px; font-weight:800; cursor:pointer; touch-action:manipulation; }
        .qs-confirm-cta-secondary { background:#f8fafc; color:#475569; border:1.5px solid #e2e8f0; }
        .ad-divider { display:flex; align-items:center; gap:8px; margin:14px 12px 6px; }
        .ad-divider::before, .ad-divider::after { content:''; flex:1; border-top:1px dashed #e2e8f0; }
        .ad-divider span { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; }
        .ad-lvl-chips { display:flex; gap:6px; flex-wrap:wrap; }
        .ad-lvl-chip { padding:7px 14px; border-radius:16px; border:1.5px solid #e2e8f0; background:#f8fafc; font-size:12px; font-weight:600; color:#475569; cursor:pointer; }
        .ad-lvl-chip.on { background:#1e40af; border-color:#1e40af; color:#fff; }
        .ad-lvl-chip:active { opacity:0.75; }
        .ad-sort-bar { display:flex; gap:6px; margin-bottom:10px; }
        .ad-sort { padding:5px 11px; border-radius:14px; border:1.5px solid #e2e8f0; background:#f8fafc; font-size:11px; font-weight:600; color:#64748b; cursor:pointer; }
        .ad-sort.on { background:#0f172a; border-color:#0f172a; color:#fff; }
        .ad-sort:active { opacity:0.75; }
        .ad-results { display:flex; flex-direction:column; gap:8px; }
        .ad-result { border:1.5px solid #e2e8f0; border-radius:11px; padding:12px 14px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .ad-result:active { background:#f0fdfa; border-color:${G_TEAL}; }
        .ad-result.on { background:#f0fdfa; border-color:${G_TEAL}; }
        .ad-result-left { flex:1; min-width:0; }
        .ad-result-prod { font-size:13px; font-weight:700; color:#0f172a; }
        .ad-result-sec { font-size:11px; color:#64748b; margin-top:3px; }
        .ad-result-price { font-size:11px; color:#16a34a; font-weight:700; margin-top:3px; }
        .ad-result-right { flex-shrink:0; text-align:right; }
        .ad-result-count { font-size:15px; font-weight:800; color:#16a34a; }
        .ad-result-arrow { font-size:18px; color:#cbd5e1; margin-left:2px; flex-shrink:0; }
        .ad-lt-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .ad-lt { border:1.5px solid #e2e8f0; border-radius:11px; padding:13px 14px; background:#fff; cursor:pointer; display:flex; flex-direction:column; gap:4px; }
        .ad-lt:active { background:#f0fdfa; border-color:${G_TEAL}; }
        .ad-lt-prefix { font-size:22px; font-weight:900; color:${G_DARK}; line-height:1; }
        .ad-lt-label { font-size:12px; font-weight:700; color:#0f172a; }
        .ad-lt-price { font-size:11px; color:#475569; font-weight:500; }
        .ad-lt-avail { font-size:11px; color:#16a34a; font-weight:600; }
        .ad-lt-arrow { font-size:16px; color:#cbd5e1; align-self:flex-end; margin-top:2px; }
        .ad-show-all { width:100%; padding:11px; border-radius:10px; border:1.5px dashed #cbd5e1; background:#f8fafc; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; margin-top:8px; text-align:center; display:block; }
        .ad-show-all:active { background:#f0fdfa; }
        .ad-loading { font-size:12px; color:#94a3b8; padding:6px 0; }
        .ad-empty { font-size:12px; color:#94a3b8; text-align:center; padding:14px 0; }
        .agent-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(80px); background:#075E54; color:#fff; font-size:13px; font-weight:600; padding:12px 20px; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.25); z-index:9999; opacity:0; transition:opacity 0.3s, transform 0.3s; max-width:320px; text-align:center; white-space:nowrap; }
        .agent-toast.toast-err { background:#dc2626; }
        .agent-toast.toast-in  { opacity:1; transform:translateX(-50%) translateY(0); }
        /* ── Product Assets Panel ── */
        #assets-panel { margin: 10px 10px 0; background:#fff; border:1.5px solid #cbd5e1; border-radius:14px; overflow:hidden; min-height:40px; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
        @media (prefers-color-scheme:dark){ #assets-panel{ background:#1e293b; border-color:#475569; } }
        .ap-wrap { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fff; }
        .ap-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; user-select: none; gap: 8px; }
        .ap-header:hover { background: #f8fafc; }
        .ap-header-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .ap-toggle { font-size: 14px; color: #64748b; flex-shrink: 0; }
        .ap-title { font-size: 13px; font-weight: 600; color: #1e293b; white-space: nowrap; }
        .ap-mini-strip { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .ap-mini { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0; }
        .ap-mini-more { width: 36px; height: 36px; border-radius: 6px; background: #f1f5f9; border: 1px solid #e2e8f0; font-size: 10px; font-weight: 600; color: #64748b; display: flex; align-items: center; justify-content: center; }
        .ap-body { border-top: 1px solid #e2e8f0; }
        .ap-tabs { display: flex; gap: 0; border-bottom: 1px solid #e2e8f0; }
        .ap-tab { padding: 9px 16px; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; }
        .ap-tab:hover { color: #1e293b; }
        .ap-tab.on { color: #075E54; border-bottom-color: #075E54; }
        .ap-pane { padding: 12px; }
        .ap-photo-strip { display: flex; flex-direction: column; gap: 0; padding-bottom: 4px; }
        .ap-photo { width: 100%; height: auto; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0; transition: opacity .15s; display: block; }
        .ap-photo:hover { opacity: .85; }
        .ap-vid-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
        .ap-vid-card { position: relative; border-radius: 8px; overflow: hidden; cursor: pointer; border: 1px solid #e2e8f0; }
        .ap-vid-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .ap-vid-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-60%); width: 36px; height: 36px; background: rgba(0,0,0,.55); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #fff; }
        .ap-vid-cap { padding: 6px 8px; font-size: 11px; color: #475569; background: #f8fafc; }
        .ap-doc-list { display: flex; flex-direction: column; gap: 6px; }
        .ap-doc { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: inherit; transition: background .15s; }
        .ap-doc:hover { background: #f8fafc; }
        .ap-doc-icon { font-size: 22px; flex-shrink: 0; }
        .ap-doc-info { flex: 1; min-width: 0; }
        .ap-doc-name { font-size: 13px; font-weight: 500; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ap-doc-size { font-size: 11px; color: #94a3b8; }
        .ap-doc-dl { font-size: 16px; color: #075E54; flex-shrink: 0; }
        .ap-loading { padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
        #ap-lightbox { position: fixed; inset: 0; z-index: 9999; display: none; align-items: center; justify-content: center; }
        #ap-lb-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.85); }
        #ap-lb-img { position: relative; max-width: 92vw; max-height: 85vh; border-radius: 6px; object-fit: contain; }
        #ap-lb-close { position: absolute; top: 16px; right: 16px; z-index: 1; background: rgba(255,255,255,.15); border: none; color: #fff; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        #ap-lb-prev, #ap-lb-next { position: absolute; top: 50%; transform: translateY(-50%); z-index: 1; background: rgba(255,255,255,.15); border: none; color: #fff; font-size: 28px; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        #ap-lb-prev { left: 16px; }
        #ap-lb-next { right: 16px; }
        @media (max-width: 480px) {
          .ap-photo { width: 100%; height: auto; }
          .ap-vid-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
        }
        @page { margin: 0; size: A4 landscape; }
        @media print {
          .col-hidden { display: none !important; }
          *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { background: #fff !important; margin: 0; padding: 0; }
          .print-only { display: block !important; }
          #topbar, .s-label, #zone-filter, #layout-area, .no-print,
          #dp-strip, .avail-banner, #btn-challenge, .s-card:not(#quote-section), .tab-placeholder,
          #tab-home, #tab-earning, #tab-team, #tab-me, #inventory-list-view, #assets-panel,
          #memo-backdrop, #memo-drawer, #forms-backdrop, #forms-drawer, #sites-backdrop, #sites-drawer, #training-backdrop, #training-drawer, #challenge-backdrop, #challenge-drawer, #announcement-backdrop, #announcement-drawer, #poster-modal-backdrop { display: none !important; }
          #tab-browse, #inventory-layout-view { display: block !important; }
          #phone { max-width: 100% !important; width: 100% !important; margin: 0 !important; background: #fff !important; }
          #scroll-body { overflow: visible !important; padding: 0 !important; }
          #quote-section { width: 100% !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .s-card { margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .quote-empty { display: none !important; }
          .qt-scroll { overflow: visible !important; width: 100% !important; }
          .qt { font-size: 16px !important; width: 100% !important; }
          .qt td, .qt th { padding: 5px 10px !important; }
          .qt thead th:not(.nlp-th) { font-size: 16px !important; background: #1a3a6b !important; color: #fff !important; }
          .qt thead th.nlp-th { font-size: 16px !important; color: #1a3a6b !important; }
          .qt tr.tnet td { font-size: 17px !important; }
          .qt-header .h-brand { font-size: 20px !important; }
          .qt-header .h-site-zh, .qt-header .h-section { font-size: 17px !important; }
          .qt-header .h-category, .qt-header .h-product, .qt-header .h-lot { font-size: 16px !important; }
          .qt-footer { font-size: 13px !important; }
          .qt tr.tred td { color: #dc2626 !important; font-weight: 700 !important; }
          .qt tr.tpnp td  { background: #fef9c3 !important; }
          .qt tr.tinst td { background: #dbeafe !important; }
          .qt tr.ttenure td { background: #c6efce !important; font-weight: 700 !important; }
          .qt tr.tnet td  { background: #1a3a6b !important; color: #fff !important; font-weight: 700 !important; }
          .qt tr.tnet td.tv { border-left: 3px solid #fff !important; }
          .qt tr.tsection-hdr td[style*="border-left:2px solid #fff"] { border-left: 2px solid #fff !important; border-right: 2px solid #fff !important; }
          .qt tr.tdr td   { background: #ffeb9c !important; color: #9c5700 !important; font-weight: 700 !important; }
          .qt tbody tr td:first-child  { border-right: none !important; }
          .qt tbody tr td:nth-child(2) { border-left: none !important; border-right: 2px solid #1a3a6b !important; }
          .wm-wrap { display: block !important; }
          #print-footer { display: flex !important; justify-content: space-between !important; margin-top: 6px !important; padding-top: 4px !important; border-top: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #64748b !important; width: 100% !important; }
        }
      ` }} suppressHydrationWarning />

      {/* Inject initial sites list via data attribute — React renders this on client nav unlike inline scripts */}
      <div id="agent-config" data-sites={JSON.stringify(sites)} style={{display:"none"}} />

      <div id="phone">

        <div id="topbar" className="no-print" style={{position:"relative"}}>
          <button id="btn-menu" aria-label="Menu" style={{position:'relative'}}>
            <span/><span/><span/>
            <span style={{position:'absolute', top:'-2px', right:'-2px', width:'9px', height:'9px', background:'#dc2626', borderRadius:'50%', display:'block', pointerEvents:'none'}}></span>
          </button>
          <div id="side-menu-backdrop"></div>
          <div id="side-menu">
            <button className="menu-item" id="btn-menu-announcement">
              <span className="menu-icon">📢</span>Announcement<span className="menu-badge">NEW</span>
            </button>
            <button className="menu-item" id="btn-menu-memo">
              <span className="menu-icon">📋</span>Price List & Promo Memo
            </button>
            <button className="menu-item" id="btn-menu-forms">
              <span className="menu-icon">📝</span>Forms
            </button>
            <button className="menu-item" id="btn-menu-training">
              <span className="menu-icon">📅</span>Training &amp; Event
            </button>
            <button className="menu-item" id="btn-menu-sites">
              <span className="menu-icon">📍</span>Site Address &amp; Phone
            </button>
            <button className="menu-item" id="btn-menu-logout">
              <span className="menu-icon">🚪</span>Log Out
            </button>
          </div>
          <h1>Sales Agent Assist</h1>
          <a href="https://www.nirvana.com.my/getting-started/home-english/360-virtual-tour/" target="_blank" rel="noopener noreferrer" className="btn-pdf">360°</a>
          <button id="btn-pdf" className="btn-pdf" style={{ display: "none" }}>🖨 PDF</button>
        </div>

        <div id="pr-debug" className="no-print" style={{position:'fixed', top:'62px', right:'6px', zIndex:9999, background:'rgba(0,0,0,0.75)', color:'#0f0', fontSize:'10px', padding:'3px 6px', borderRadius:'6px', fontFamily:'monospace', pointerEvents:'none'}}>pr:idle</div>
        <div id="scroll-body">
          <div id="pull-refresh-indicator" className="no-print">
            <div id="pull-refresh-spinner"></div>
            <div id="pull-refresh-label">Pull down to refresh</div>
          </div>

          {/* ── Tab: Home ── */}
          <div id="tab-home" className="tab-panel">
            <button id="btn-challenge" className="no-print">
              <div className="btn-challenge-left">
                <div className="btn-challenge-title">🏆 NV Challenge Go! Go! Go! 🔥</div>
                <div className="btn-challenge-sub">🎯 View this month&apos;s challenge &amp; targets</div>
              </div>
              <div className="btn-challenge-arrow">›</div>
            </button>

            <button id="home-whats-new-teaser">
              <span className="hwn-icon">💡</span>
              <div className="hwn-body">
                <div className="hwn-title">What&apos;s New</div>
                <div className="hwn-sub">Tap to see this month&apos;s updates</div>
              </div>
              <span className="hwn-arrow">›</span>
            </button>

            <div id="home-goal-card"></div>

            <div className="s-label no-print" style={{marginTop:"6px"}}>
              <span className="s-title">Recent Quotes</span>
            </div>
            <div id="home-recent-quotes"></div>
          </div>

          {/* ── Tab: Earning ── */}
          <div id="tab-earning" className="tab-panel">
            <div className="tab-placeholder">
              <span className="tp-icon">$</span>
              <span className="tp-title">Earning</span>
              <span className="tp-sub">Coming soon.</span>
            </div>
          </div>

          {/* ── Tab: Browse (combined Inventory + Quote — list, layout, and quote
               all live in one continuous scroll so switching tabs never breaks
               the flow of picking a product and seeing its price) ── */}
          <div id="tab-browse" className="tab-panel">
            {/* ── List view: browse by price & availability ── */}
            <div id="inventory-list-view">
              {/* ── Quick Select — fast path for agents who already know the
                   product; skips the filter wizard entirely and jumps straight
                   to the layout grid ── */}
              {/* Quick Select — one banner opening the 3-step stepper
                   (Site → Zone → Section) below. The buttons/select here
                   stay in the DOM but hidden — they're the state holders
                   the stepper logic reads/writes; only the banner itself
                   and the stepper overlay are ever visible. */}
              <div className="qs-card no-print">
                <button id="qs-banner-btn" className="qs-banner">
                  <span className="qs-banner-icon">⚡</span>
                  <span className="qs-banner-body">
                    <span className="qs-banner-title">Quick Select</span>
                    <span className="qs-banner-sub" id="qs-banner-sub">Pick a site, zone &amp; section fast</span>
                  </span>
                  <span className="qs-banner-chev">›</span>
                </button>
                <div id="zone-filter" style={{display:'none'}}>
                  <button id="site-dd-btn" className="placeholder">
                    <span id="site-dd-val">Select site…</span>
                  </button>
                  <button id="zone-dd-btn" className="placeholder" disabled>
                    <span id="zone-dd-val">Select zone…</span>
                  </button>
                  <div id="section-wrap">
                    <select id="section-sel" disabled>
                      <option value="">N/A</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="ad-divider no-print"><span>or filter</span></div>

              {/* Filter Products — banner opens the full-screen stepper below.
                   Reuses the exact same avail-content rendering/fetch logic as
                   before; only where it's mounted (hidden overlay vs inline)
                   and how much is shown at once (one step vs all stacked) changed. */}
              <button id="filter-banner-btn" className="qs-banner no-print" style={{margin:'0 10px 10px'}}>
                <span className="qs-banner-icon">⚙</span>
                <span className="qs-banner-body">
                  <span className="qs-banner-title">Filter Products</span>
                  <span className="qs-banner-sub" id="filter-banner-sub">Narrow down by type, site &amp; features</span>
                </span>
                <span className="qs-banner-chev">›</span>
              </button>
            </div>

            {/* ── Layout view: shown after picking a product from the list ── */}
            <div id="inventory-layout-view" style={{display:"none"}}>
              <button id="btn-inventory-back" className="no-print">‹ Back to product list</button>

              {/* ── Product Assets (between selector and layout) ── */}
              <div id="assets-panel" className="no-print">
                <div style={{padding:"10px 14px",fontSize:"12px",color:"#94a3b8"}}>No product materials</div>
              </div>

              <div className="s-card">
                <div className="s-label no-print">
                  <div style={{flex:1}}>
                    <div className="s-title">Select Available Product</div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"2px"}}>
                      <span id="layout-synced-at" style={{fontSize:"10px",color:"#94a3b8"}}></span>
                    </div>
                  </div>
                  <button id="btn-reset" className="btn-reset">↺ Reset</button>
                  <button id="btn-reload" className="btn-reset" style={{marginLeft:"4px"}}>⟳ Reload</button>
                </div>
                <div id="layout-area">
                  <div className="layout-placeholder">
                    <span className="lp-icon">🗺️</span>
                    <span className="lp-title">Zone layout will appear here</span>
                    <span className="lp-sub">Select a site and zone above</span>
                  </div>
                </div>
              </div>

              {/* ── Quote — builds live below the layout as niches are tapped ── */}
              <div className="s-card" id="quote-section">
                <div className="s-label no-print">
                  <div className="s-dot">3</div>
                  <span className="s-title">Quotation</span>
                </div>
                <div id="quote-body">
                  <div className="quote-empty">
                    <span className="qe-icon">📋</span>
                    <span className="qe-msg">Select a niche above to see pricing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sticky total bar — appears the moment a niche is selected,
                 so Print is one tap away without scrolling ── */}
            <div id="browse-stickybar" className="no-print" style={{display:"none"}}>
              <div id="browse-sticky-info">
                <div id="browse-sticky-count"></div>
                <div id="browse-sticky-total"></div>
              </div>
              <button id="browse-sticky-print">🖨 Print</button>
            </div>
          </div>

          {/* ── Tab: Team ── */}
          <div id="tab-team" className="tab-panel">
            <div id="team-scope-banner" className="no-print"></div>
            <div id="team-list"></div>
          </div>

          {/* ── Tab: Me ── */}
          <div id="tab-me" className="tab-panel">
            <div id="me-goal-card"></div>

            <div id="me-team-card"></div>

            <div className="s-label no-print" style={{marginTop:"6px"}}>
              <span className="s-title">Your Quotes</span>
            </div>
            <div id="me-quotes-list"></div>
          </div>

        </div>

        {/* ── Bottom tab bar ── */}
        <div id="tab-bar" className="no-print">
          <button className="tab-btn active" data-tab="home"><span className="tab-btn-icon">⌂</span>Home</button>
          <button className="tab-btn" data-tab="earning"><span className="tab-btn-icon">$</span>Earning</button>
          <button className="tab-btn" data-tab="browse"><span className="tab-btn-icon">▦</span>Browse</button>
          <button className="tab-btn" data-tab="team"><span className="tab-btn-icon">⋔</span>Team</button>
          <button className="tab-btn" data-tab="me"><span className="tab-btn-icon">♟</span>Me</button>
        </div>

        <div id="print-footer">
          <span id="print-date"></span>
          <span>Page 1</span>
        </div>

      </div>

      {/* Price List & Promo Memo drawer */}
      {/* Quick Select stepper — Site then Zone, full-screen, one step at a
          time (replaces the old two small bottom drawers) */}
      <div id="qs-stepper">
        <div id="qs-stepper-topbar">
          <button id="qs-stepper-back">‹</button>
          <div id="qs-stepper-title-wrap">
            <div id="qs-stepper-step-count"></div>
            <h2 id="qs-stepper-title"></h2>
          </div>
          <button id="qs-stepper-close">×</button>
        </div>
        <div id="qs-stepper-dots"></div>
        <div id="qs-stepper-body">
          <div id="site-dd-panel" className="qs-step-panel"></div>
          <div id="zone-dd-panel" className="qs-step-panel" style={{display:'none'}}></div>
          <div id="qs-section-panel" className="qs-step-panel" style={{display:'none'}}></div>
        </div>
      </div>

      {/* Filter Products stepper — Type → Site → Available Zones → Section/
          Lot Type → (Level), full-screen, one step at a time. avail-content
          is the same element renderDrawer() has always rendered into; only
          #filter-stepper-body's CSS (show last .ad-card only) makes it act
          like a stepper instead of a stacked scroll. */}
      <div id="filter-stepper">
        <div id="filter-stepper-topbar">
          <button id="filter-stepper-back">‹</button>
          <div id="filter-stepper-title-wrap">
            <div id="filter-stepper-step-count"></div>
            <h2 id="filter-stepper-title"></h2>
          </div>
          <button id="filter-stepper-close">×</button>
        </div>
        <div id="filter-stepper-dots"></div>
        <div id="filter-stepper-body"><div id="avail-scroll"><div id="avail-content"></div></div></div>
      </div>

      <div id="memo-backdrop"></div>
      <div id="memo-drawer">
        <div id="memo-drawer-handle"></div>
        <div id="memo-drawer-topbar">
          <h2>Price List & Promo Memo</h2>
          <button id="memo-drawer-close">×</button>
        </div>
        <div id="memo-tabs">
          <button className="memo-tab active" data-tab="pricelist">Price List</button>
          <button className="memo-tab" data-tab="promo">Promo Memo</button>
        </div>
        <div id="memo-scroll">
          {(() => {
            const plBase = "https://orlneoqfdgiatvybvgar.supabase.co/storage/v1/object/public/product-assets/Promotion%20Memo/Price%20List/";
            const priceLists = [
              { file: "0 N3_Price List with PV.pdf",           title: "Nirvana 3 (N3)",    sub: "Price List with PV" },
              { file: "1 Nckl_Price List with PV.pdf",         title: "NCKL",              sub: "Price List with PV" },
              { file: "2 Ijok_Price List with PV.pdf",         title: "Ijok",              sub: "Price List with PV" },
              { file: "3 Ipoh_Price List with PV.pdf",         title: "Ipoh",              sub: "Price List with PV" },
              { file: "4 Karak_Price List with PV.pdf",        title: "Karak",             sub: "Price List with PV" },
              { file: "5 Klang_Price List with PV.pdf",        title: "Klang",             sub: "Price List with PV" },
              { file: "6 Kuantan_Price List with PV.pdf",      title: "Kuantan",           sub: "Price List with PV" },
              { file: "7 Semenyih NMG_Price List with PV.pdf", title: "Semenyih NMG",      sub: "Price List with PV" },
              { file: "9 Shah Alam_Price List with PV.pdf",    title: "Shah Alam",         sub: "Price List with PV" },
            ];
            const promoBase = "https://orlneoqfdgiatvybvgar.supabase.co/storage/v1/object/public/product-assets/Promotion%20Memo/Q3_2026_Jul_to_Sep/";
            const memos = [
              { file: "99-2026 CR - Customer Promotion for July to Aug 2026.pdf",   title: "Central Region",  sub: "Memo 99/2026 · Jul – Aug 2026" },
              { file: "100-2026 Pre-Need NLP Customer Promo July  to Aug 2026.pdf", title: "Pre-Need NLP",    sub: "Memo 100/2026 · Jul – Aug 2026" },
              { file: "101-2026 SMY - Customer Promo Q3 2026.pdf",                  title: "Semenyih",        sub: "Memo 101/2026 · Q3 2026" },
              { file: "102-2026 Klang - Customer Promo Q3 2026 (1).pdf",            title: "Klang",           sub: "Memo 102/2026 · Q3 2026" },
              { file: "103-2026  NCKL - Customer Promo Q3 2026.pdf",                title: "NCKL",            sub: "Memo 103/2026 · Q3 2026" },
              { file: "104-2026 N3 - Customer Promo July 2026.pdf",                 title: "N3",              sub: "Memo 104/2026 · Jul 2026" },
              { file: "119-2026 N3 - Customer Promo Aug & Sept 2026.pdf",           title: "N3",              sub: "Memo 119/2026 · Aug – Sep 2026" },
              { file: "105-2026 SAMP - Customer Promo Q3 2026.pdf",                 title: "Shah Alam",       sub: "Memo 105/2026 · Q3 2026" },
              { file: "106-2026 Ipoh - Customer Promo Q3 2026.pdf",                 title: "Ipoh",            sub: "Memo 106/2026 · Q3 2026" },
              { file: "107-2026 Ijok - Customer Promo Q3 2026.pdf",                 title: "Ijok",            sub: "Memo 107/2026 · Q3 2026" },
              { file: "108-2026 Karak - Customer Promo Q3 2026.pdf",                title: "Karak",           sub: "Memo 108/2026 · Q3 2026" },
              { file: "109-2026 Kuantan - Customer Promo Q3 2026.pdf",              title: "Kuantan",         sub: "Memo 109/2026 · Q3 2026" },
              { file: "Enlightenment Promo.pdf",                                    title: "Enlightenment",   sub: "Promo Memo" },
            ];
            const makeItems = (items: {file:string;title:string;sub:string}[], base: string, icon: string) =>
              items.map(m => (
                <a key={m.file} className="memo-item" href={base + encodeURIComponent(m.file)} target="_blank" rel="noopener noreferrer">
                  <span className="memo-item-icon">{icon}</span>
                  <span className="memo-item-body">
                    <div className="memo-item-title">{m.title}</div>
                    <div className="memo-item-sub">{m.sub}</div>
                  </span>
                  <span className="memo-item-arrow">›</span>
                </a>
              ));
            return (
              <>
                <div className="memo-panel active" id="memo-panel-pricelist">{makeItems(priceLists, plBase, '💰')}</div>
                <div className="memo-panel" id="memo-panel-promo">{makeItems(memos, promoBase, '📄')}</div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Forms drawer */}
      <div id="forms-backdrop"></div>
      <div id="forms-drawer">
        <div id="forms-drawer-handle"></div>
        <div id="forms-drawer-topbar">
          <h2>Forms</h2>
          <button id="forms-drawer-close">×</button>
        </div>
        <div id="forms-scroll">
          <a className="memo-item" href="https://orlneoqfdgiatvybvgar.supabase.co/storage/v1/object/public/product-assets/Forms/Direct%20Debit%20Authorisation%20Form%20(V2).pdf" target="_blank" rel="noopener noreferrer">
            <span className="memo-item-icon">📝</span>
            <span className="memo-item-body">
              <div className="memo-item-title">Direct Debit Authorisation Form</div>
              <div className="memo-item-sub">V2</div>
            </span>
            <span className="memo-item-arrow">›</span>
          </a>
          {[
            { id: "1CpDEVnhFkPNS4Hzjvl7BuQ5J-HMM2J9c", title: "Update Customer Profile",                sub: "NV-CSD-F06 · Rev 5" },
            { id: "1mJO_5eyyY4_XuIyk0WHTjVMj2uCcmqjh", title: "Addendum to Purchase Order",             sub: "V1 · Aug 2024" },
            { id: "1RifYt9R4duMH8QfQb709cu4hN9EFXvcN", title: "Form III — Change of Product",           sub: "NV-CSD-F12 · Rev 2" },
            { id: "1M6vgkK6KRe50h9MqkcNMDQfyikzoV_yi", title: "Form II — Cancellation (Refund)",        sub: "NV-CSD-F10 · Rev 4" },
            { id: "1RaTWkiY0jV12ZwrqVJ_9c-5XRfVHEMnv", title: "Form I — Cancellation (Transfer)",      sub: "NV-CSD-F09 · Rev 2" },
            { id: "13hNJLPtpThNLfmVUL7CmxDdvaTOrRp8E", title: "Product Cert Letter of Authorisation",  sub: "Rev 2 · Jan 2017" },
            { id: "1NiO1PWisll0uFhpbs0uLWP_9kxGSENZF", title: "Auto Debit — One Time",                 sub: "Dec 2018" },
            { id: "1UhWlqiaaPu-6WOR1UMsjI0JsjM4iprUI", title: "Credit Card Refund Form",               sub: "Revised" },
          ].map(f => (
            <a key={f.id} className="memo-item" href={`https://drive.google.com/file/d/${f.id}/view`} target="_blank" rel="noopener noreferrer">
              <span className="memo-item-icon">📝</span>
              <span className="memo-item-body">
                <div className="memo-item-title">{f.title}</div>
                <div className="memo-item-sub">{f.sub}</div>
              </span>
              <span className="memo-item-arrow">›</span>
            </a>
          ))}
        </div>
      </div>

      {/* Site Address & Phone drawer */}
      <div id="sites-backdrop"></div>
      <div id="sites-drawer">
        <div id="sites-drawer-handle"></div>
        <div id="sites-drawer-topbar">
          <h2>Site Address &amp; Phone</h2>
          <button id="sites-drawer-close">×</button>
        </div>
        <div id="sites-scroll">
          {[
            {
              name: "Nirvana 3 (Sales & Marketing Office)",
              addr: "Level 9, Nirvana 3, No. 12, Jalan Dewan Bahasa, Bukit Seputeh, 50460 Kuala Lumpur",
              tels: [{ label: "03-2779 1818", num: "0327791818" }],
            },
            {
              name: "Nirvana Center KL (Nirvana 2)",
              addr: "16, Jalan Dewan Bahasa, Bukit Seputeh, 50460 Kuala Lumpur",
              tels: [{ label: "03-9212 2888", num: "0392122888" }],
            },
            {
              name: "Nirvana Memorial Center (Sungai Besi)",
              addr: "Wisma Nirvana, No 1, Jalan 1/116A, Off Jalan Sungai Besi, 57100 Kuala Lumpur",
              tels: [{ label: "1800-88-1818", num: "1800881818" }],
            },
            {
              name: "Nirvana Memorial Garden, Semenyih",
              addr: "Lot 1170, Jalan Sg Lalang, Batu 30, 43500 Semenyih, Selangor",
              tels: [{ label: "1800-88-3778", num: "1800883778" }],
            },
            {
              name: "Nirvana Memorial Park, Semenyih",
              addr: "Batu 6, Jalan Kachau, 43500 Semenyih, Selangor",
              tels: [{ label: "1800-88-3778", num: "1800883778" }],
            },
            {
              name: "Nirvana Memorial Park, Shah Alam",
              addr: "Tmn Perkuburan Seksyen 21, Jalan Pusaka 21/1, Off Persiaran Jubli Perak, 40300 Shah Alam, Selangor",
              tels: [{ label: "03-7890 5555", num: "0378905555" }],
            },
            {
              name: "Nirvana Memorial Park, Klang",
              addr: "Jalan 8, Bukit Cerakah Meru, 42200 Klang, Selangor",
              tels: [{ label: "03-7890 3299", num: "0378903299" }],
            },
            {
              name: "Nirvana Memorial Park, Ijok",
              addr: "Lot 539, Jalan Tungsten, 48020 Batang Berjuntai, Selangor",
              tels: [{ label: "03-3275 0888", num: "0332750888" }],
            },
            {
              name: "Nirvana Memorial Park, Ipoh",
              addr: "Lot 21990, Batu 13, Jalan Tanjung Rambutan Chemor, 31250 Tanjung Rambutan, Perak\nSales Gallery: No. 8 & 10, Lorong Chung Thye Phin, 30250 Ipoh, Perak\nNirvana Center: Lot 370S, Jalan Masjid, Taman Jubilee, 30300 Ipoh, Perak",
              tels: [{ label: "017-974 0733", num: "0179740733" }, { label: "05-238 0738", num: "0052380738" }, { label: "05-238 1818", num: "0052381818" }],
            },
            {
              name: "Nirvana Memorial Park, Karak",
              addr: "Lot 1128, KM 76 Exit 813A, Lebuhraya Karak, 28600 Karak, Pahang",
              tels: [{ label: "09-275 0555", num: "092750555" }],
            },
            {
              name: "Nirvana Memorial Park, Kuantan",
              addr: "Lot 1528, Mukim, 26310 Kuantan, Pahang\nSales Gallery: Lot 2055, Ground Floor, West Wing, Sri Kuantan Square, Jalan Seri Kuantan 2, 25050 Kuantan, Pahang",
              tels: [{ label: "09-522 0606", num: "095220606" }],
            },
          ].map((s, i) => (
            <div key={i} className="site-card">
              <div className="site-card-name">{s.name}</div>
              <div className="site-card-addr">{s.addr.split('\n').map((line, j) => <span key={j}>{line}<br/></span>)}</div>
              <div className="site-card-phones">
                {s.tels.map(t => (
                  <a key={t.num} className="site-card-tel" href={`tel:${t.num}`}>📞 {t.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Announcement drawer */}
      <div id="announcement-backdrop"></div>
      <div id="announcement-drawer">
        <div id="announcement-drawer-handle"></div>
        <div id="announcement-drawer-topbar">
          <h2>Announcement</h2>
          <button id="announcement-drawer-close">×</button>
        </div>
        <div id="announcement-scroll">
          {/* ── What's New ── update this list each month ── */}
          <div id="whats-new-box" style={{margin:'14px 14px 0', background:'#fefce8', border:'1px solid #fde047', borderRadius:'10px', overflow:'hidden'}}>
            <button id="btn-whats-new-toggle" style={{width:'100%', background:'none', border:'none', padding:'12px 14px', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', textAlign:'left'}}>
              <span style={{fontSize:'12px'}}>🔔</span>
              <span style={{fontSize:'12px', fontWeight:800, color:'#854d0e', flex:1}}>What&apos;s New — August 2026</span>
              <span id="whats-new-arrow" style={{fontSize:'12px', color:'#854d0e', transition:'transform 0.2s'}}>▾</span>
            </button>
            <div id="whats-new-body" style={{padding:'0 14px 12px'}}>
              <ul style={{margin:0, padding:'0 0 0 4px', fontSize:'12px', color:'#713f12', lineHeight:'1.9', listStyle:'none', maxHeight:'160px', overflowY:'auto'}}>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>6 Aug</span><span>• Site grouping introduced — you can now select sites by region: NLP, Central, or Southern</span></li>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>6 Aug</span><span>• Southern region: Melaka site uploaded to system (ongoing)</span></li>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>6 Aug</span><span>• Shah Alam MP3-2F-RS1 (Ming Palace 3 Royal Suite 1) new launch — added to the system with price list, layout, and product assets</span></li>
              <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>5 Aug</span><span>• Quotation now shows full product details — facing direction, plot size, and burial capacity — for all land and niche products</span></li>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>4 Aug</span><span>• Nirvana 3 N7-S2 new launch — now available in the system</span></li>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>3 Aug</span><span>• Direct Debit Authorisation Form updated to V2</span></li>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>3 Aug</span><span>• August 2026 EDM posters now available for all sites</span></li>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>2 Aug</span><span>• Enlightenment Bundle Promo now live</span></li>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>2 Aug</span><span>• N3 Customer Promo updated to Aug–Sep 2026</span></li>
                <li style={{display:'flex', gap:'8px', alignItems:'baseline'}}><span style={{color:'#a16207', fontWeight:700, minWidth:'52px', fontSize:'10px'}}>2 Aug</span><span>• NLP Comparison August 2026 added to product assets</span></li>
              </ul>
              <button id="btn-mark-read" style={{marginTop:'10px', width:'100%', padding:'8px 0', background:'#854d0e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:700, cursor:'pointer'}}>
                ✓ Mark as Read
              </button>
            </div>
          </div>

          <div style={{padding:'14px 14px 0'}}>
            {/* Monthly Presentation link */}
            <a href="https://orlneoqfdgiatvybvgar.supabase.co/storage/v1/object/sign/product-assets/NV%20Monthly%20Presentation/August%202026%20Announcement%20Day%20(1).pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTU3YTk4My1iYWYwLTQ2MzYtYWY5MS0wYjY2NzhkODlkNzYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9kdWN0LWFzc2V0cy9OViBNb250aGx5IFByZXNlbnRhdGlvbi9BdWd1c3QgMjAyNiBBbm5vdW5jZW1lbnQgRGF5ICgxKS5wZGYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzg1NTYxNDM5LCJleHAiOjE3ODgyMzk4Mzl9.LCKOh_svF1oyIx2ZBsNPzGfwdn-OaKkyFA1-Fn-Zyuk"
              target="_blank" rel="noopener noreferrer"
              style={{display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', background:'#f8fafc', borderRadius:'10px', border:'1px solid #e2e8f0', textDecoration:'none', color:'#0f172a', fontWeight:700, fontSize:'14px', marginBottom:'12px'}}>
              <span style={{fontSize:'20px'}}>📊</span>
              <span>Monthly Presentation</span>
              <span style={{marginLeft:'auto', color:'#94a3b8', fontSize:'16px'}}>›</span>
            </a>
            {/* EDM section */}
            <div style={{fontSize:'12px', fontWeight:700, color:'#64748b', letterSpacing:'0.05em', marginBottom:'8px', textTransform:'uppercase'}}>EDM</div>
            <select id="edm-site-sel" style={{width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'13px', fontWeight:600, color:'#0f172a', background:'#f8fafc', marginBottom:'12px'}}>
              <option value="">— Select Site —</option>
              <option value="Ijok">Ijok</option>
              <option value="Karak">Karak</option>
              <option value="Klang">Klang</option>
              <option value="Kuantan">Kuantan</option>
              <option value="Nckl">Nirvana Center KL (N2)</option>
              <option value="Semenyih-NMG">Semenyih (NMG)</option>
              <option value="Semenyih-NMP">Semenyih (NMP)</option>
              <option value="Shah Alam">Shah Alam</option>
              <option value="Nirvana Life Planning">Nirvana Life Planning</option>
            </select>
          </div>
          <div id="announcement-edm-list" style={{padding:'0 14px 20px'}}></div>
        </div>
      </div>

      {/* Training & Event drawer */}
      <div id="training-backdrop"></div>
      <div id="training-drawer">
        <div id="training-drawer-handle"></div>
        <div id="training-drawer-topbar">
          <h2>Training &amp; Event</h2>
          <button id="training-drawer-close">×</button>
        </div>
        <div id="training-scroll">
          {(() => {
            const base = "https://orlneoqfdgiatvybvgar.supabase.co/storage/v1/object/public/product-assets/Events%20and%20Training/Aug%202026%20E%26T/";
            const lms = "https://www.nirvana.com.my/lms/my-account/#login";
            const p = (f: string) => base + f;
            type Evt = { title: string; poster: string; color: string; register?: string; notice?: string; };
            const colorA = "#075E54", colorB = "#1a56db", colorC = "#b45309", colorD = "#7c3aed", colorE = "#be185d", colorF = "#0e7490", colorG = "#065f46", colorH = "#9d174d", colorI = "#db2777";
            const ec = { title:"中元超渡 祈福法会 (Enlightenment Ceremony)", poster:p("Enlightenment%20Ceremony.png"), color:colorI };
            const dayEvents: Record<number, Evt[]> = {
              1:  [{ title:"有一种爱是放手 — Dr. Bih Liu-Ing Talk",                                  poster:p("There%20is%20a%20Love%20Means%20Letting%20Go.png"),                                                                                    color:colorB }],
              4:  [{ title:"Rediscovering your Passion & Value At Work",                              poster:p("Rediscovering%20your%20Passion%20%26%20Value%20At%20Work.png"),                                                                          color:colorC, register:lms }],
              5:  [{ title:"Enlightenment Ceremony Site Matters Briefing (Zoom)",                     poster:p("Enlightenment%20Ceremony%20Site%20Matters%20Briefing.png"),                                                                             color:colorD, register:lms }],
              7:  [{ title:"A Waltz Between Enlightenment Ceremony Culture & Business Opportunities", poster:p("A%20Waltz%20Between%20Enlightenment%20Ceremony%20Culture%20and%20%20Business%20Opportunities.png"),                                    color:colorE, register:lms }],
              8:  [{ title:"Flow and Glow",                                                            poster:p("Flow%20and%20Glow.png"),                                                                                                              color:colorH, register:lms }],
              11: [{ title:"Caring for Others, Caring for Yourself",                                  poster:p("Caring%20for%20Otehrs%2C%20Caring%20for%20Yourself.png"),                                                                               color:colorG, register:lms },
                   { title:"Life Planning Talk and Dinner",                                           poster:p("Life%20Plannig%20Talk%20and%20Dinner.png"),                                                                                            color:"#92400e", notice:"Please register with your Leader" }],
              15: [{ title:"Kids Have You 孩好有你",  poster:p("Kids%20Have%20You.png"), color:colorA }, ec],
              16: [{ title:"Kids Have You 孩好有你",  poster:p("Kids%20Have%20You.png"), color:colorA }, ec],
              18: [{ title:"QiXi Festival Luck",      poster:p("QiXi%20Festival%20Luck.png"), color:colorF, register:lms }],
              21: [{ title:"Kids Have You 孩好有你",  poster:p("Kids%20Have%20You.png"), color:colorA }, ec],
              22: [{ title:"Kids Have You 孩好有你",  poster:p("Kids%20Have%20You.png"), color:colorA }, ec],
              23: [{ title:"Kids Have You 孩好有你",  poster:p("Kids%20Have%20You.png"), color:colorA }, ec],
              28: [ec],
              29: [{ title:"Kids Have You 孩好有你",  poster:p("Kids%20Have%20You.png"), color:colorA }, ec],
              30: [{ title:"Kids Have You 孩好有你",  poster:p("Kids%20Have%20You.png"), color:colorA }, ec],
            };
            const year = 2026, month = 7;
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const cells: (number|null)[] = Array(firstDay).fill(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);
            return (
              <>
                <div className="evt-cal">
                  <div className="evt-cal-header">
                    <span className="evt-cal-title">August 2026</span>
                  </div>
                  <div className="evt-cal-grid">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="evt-cal-day-name">{d}</div>
                    ))}
                    {cells.map((d, i) => {
                      const evts = d ? dayEvents[d] : undefined;
                      const color = evts ? (evts.length > 1 ? "#374151" : evts[0].color) : undefined;
                      return (
                        <div key={i}
                          className={"evt-cal-day" + (evts ? " has-event" : "") + (!d ? " other-month" : "")}
                          style={color ? {background: color} : undefined}
                          data-events={evts ? JSON.stringify(evts) : undefined}
                          data-cal-date={d ? `2026-08-${String(d).padStart(2,'0')}` : undefined}
                        >{d ?? ""}{evts && evts.length > 1 ? <span style={{fontSize:'7px',position:'absolute',top:'2px',right:'3px'}}>●</span> : null}</div>
                      );
                    })}
                  </div>
                </div>
                <div className="evt-legend">
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorA}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">15–16, 21–23, 29–30 Aug · 5–6 Sep · All Day</span><br/>
                      Kids Have You 孩好有你 — Shah Alam, Semenyih, KL, Klang
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorB}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">1 Aug · 2PM–4PM</span><br/>
                      有一种爱是放手 — Dr. Bih Liu-Ing Talk, Nirvana 2 KL
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorF}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">18 Aug · 7PM · Registration required</span><br/>
                      QiXi Festival Luck
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorH}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">8 Aug · 9.30AM · Registration required</span><br/>
                      Flow and Glow
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorG}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">11 Aug · 7.30PM · Registration required</span><br/>
                      Caring for Others, Caring for Yourself
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background:"#92400e"}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">11 Aug · 7PM · Register with Leader</span><br/>
                      Life Planning Talk and Dinner
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorC}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">4 Aug · 7.30PM · Registration required</span><br/>
                      Rediscovering your Passion &amp; Value At Work
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorD}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">5 Aug · 7PM · Zoom · Registration required</span><br/>
                      Enlightenment Ceremony Site Matters Briefing
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorE}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">7 Aug · 7PM · Registration required</span><br/>
                      A Waltz Between Enlightenment Ceremony Culture &amp; Business Opportunities
                    </div>
                  </div>
                  <div className="evt-legend-item">
                    <div className="evt-legend-dot" style={{background: colorI}}></div>
                    <div className="evt-legend-label">
                      <span className="evt-legend-dates">15–16, 21–23, 28–30 Aug · 9AM–5PM (Ipoh 30 Aug till 9:30PM)</span><br/>
                      中元超渡 祈福法会 — Shah Alam, Semenyih, Karak, Ipoh, Nirvana 2, Klang (5–6 Sep)
                    </div>
                  </div>
                  <div style={{fontSize:'10px', color:'#94a3b8', marginTop:'4px'}}>Tap a highlighted date to view poster</div>
                </div>

                {/* ── September 2026 ── */}
                {(() => {
                  const colorBlood = "#dc2626";
                  const bloodPoster = p("Blood%20Donation%20Drive%202026.png");
                  const sepEvents: Record<number, Evt[]> = {
                    5:  [{ title:"Kids Have You 孩好有你 — Klang",              poster:p("Kids%20Have%20You.png"),        color:colorA }, ec],
                    6:  [{ title:"Kids Have You 孩好有你 — Klang",              poster:p("Kids%20Have%20You.png"),        color:colorA }, ec],
                    20: [{ title:"Blood Donation Drive 2026 爱心捐血活动",      poster:bloodPoster,                       color:colorBlood, register:lms }],
                  };
                  const sy = 2026, sm = 8; // September = month index 8
                  const sfirstDay = new Date(sy, sm, 1).getDay();
                  const sdaysInMonth = new Date(sy, sm + 1, 0).getDate();
                  const scells: (number|null)[] = Array(sfirstDay).fill(null);
                  for (let d = 1; d <= sdaysInMonth; d++) scells.push(d);
                  while (scells.length % 7 !== 0) scells.push(null);
                  return (
                    <>
                      <div className="evt-cal" style={{marginTop:'16px', borderTop:'1px solid #e2e8f0', paddingTop:'12px'}}>
                        <div className="evt-cal-header">
                          <span className="evt-cal-title">September 2026</span>
                        </div>
                        <div className="evt-cal-grid">
                          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                            <div key={d} className="evt-cal-day-name">{d}</div>
                          ))}
                          {scells.map((d, i) => {
                            const evts = d ? sepEvents[d] : undefined;
                            const color = evts ? (evts.length > 1 ? "#374151" : evts[0].color) : undefined;
                            return (
                              <div key={i}
                                className={"evt-cal-day" + (evts ? " has-event" : "") + (!d ? " other-month" : "")}
                                style={color ? {background: color} : undefined}
                                data-events={evts ? JSON.stringify(evts) : undefined}
                                data-cal-date={d ? `2026-09-${String(d).padStart(2,'0')}` : undefined}
                              >{d ?? ""}{evts && evts.length > 1 ? <span style={{fontSize:'7px',position:'absolute',top:'2px',right:'3px'}}>●</span> : null}</div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="evt-legend">
                        <div className="evt-legend-item">
                          <div className="evt-legend-dot" style={{background: colorA}}></div>
                          <div className="evt-legend-label">
                            <span className="evt-legend-dates">5–6 Sep · All Day</span><br/>
                            Kids Have You 孩好有你 — Klang
                          </div>
                        </div>
                        <div className="evt-legend-item">
                          <div className="evt-legend-dot" style={{background: colorI}}></div>
                          <div className="evt-legend-label">
                            <span className="evt-legend-dates">5–6 Sep · 9AM–5PM</span><br/>
                            中元超渡 祈福法会 — Klang
                          </div>
                        </div>
                        <div className="evt-legend-item">
                          <div className="evt-legend-dot" style={{background: colorBlood}}></div>
                          <div className="evt-legend-label">
                            <span className="evt-legend-dates">20 Sep · 10AM–1PM · Registration required</span><br/>
                            Blood Donation Drive 2026 — Level 3A Link Bridge, Nirvana 2 KL
                          </div>
                        </div>
                        <div style={{fontSize:'10px', color:'#94a3b8', marginTop:'4px'}}>Tap a highlighted date to view poster</div>
                      </div>
                    </>
                  );
                })()}
              </>
            );
          })()}
        </div>
      </div>

      {/* Event picker — shown when multiple events fall on the same date */}
      <div id="evt-picker-backdrop">
        <div id="evt-picker-box">
          <div id="evt-picker-title">Select event to view</div>
          <div id="evt-picker-list"></div>
        </div>
      </div>

      {/* Poster modal */}
      <div id="poster-modal-backdrop">
        <button id="poster-modal-close">×</button>
        <img id="poster-modal-img" src={undefined} alt="Event poster" />
        <a id="poster-modal-register" href="#" target="_blank" rel="noopener noreferrer" style={{display:'none', padding:'10px 28px', background:'#b45309', color:'#fff', borderRadius:'8px', fontWeight:700, fontSize:'14px', textDecoration:'none'}}>Register Now</a>
        <div id="poster-modal-notice" style={{display:'none'}}></div>
      </div>

      {/* Set Goal modal — Team tab */}
      <div id="goal-modal-backdrop">
        <div id="goal-modal-box">
          <div id="goal-modal-title">Set Monthly Goal</div>
          <div id="goal-modal-sub"></div>
          <div className="f-lbl" style={{marginTop:"10px"}}>Target amount (RM)</div>
          <input id="goal-modal-amount" type="number" inputMode="decimal" placeholder="0.00" />
          <div id="goal-modal-actions">
            <button id="goal-modal-cancel">Cancel</button>
            <button id="goal-modal-confirm">Save Goal</button>
          </div>
        </div>
      </div>

      {/* Mark as Sold modal — Me tab */}
      <div id="sold-modal-backdrop">
        <div id="sold-modal-box">
          <div id="sold-modal-title">Mark as Sold</div>
          <div id="sold-modal-sub"></div>
          <div className="f-lbl" style={{marginTop:"10px"}}>Final amount (RM)</div>
          <input id="sold-modal-amount" type="number" inputMode="decimal" placeholder="0.00" />
          <div id="sold-modal-actions">
            <button id="sold-modal-cancel">Cancel</button>
            <button id="sold-modal-confirm">Confirm Sold</button>
          </div>
        </div>
      </div>

      {/* Monthly Challenge drawer */}
      <div id="challenge-backdrop"></div>
      <div id="challenge-drawer">
        <div id="challenge-drawer-handle"></div>
        <div id="challenge-drawer-topbar">
          <h2>Monthly Challenge</h2>
          <button id="challenge-drawer-close">×</button>
        </div>
        <div id="challenge-scroll">
          {(() => {
            const base = "https://orlneoqfdgiatvybvgar.supabase.co/storage/v1/object/public/product-assets/NV%20Challenge/Adora%20Cruise%20Challenge/";
            const files = [
              "2026-08-01 163053.png",
              "2026-08-01 163208.png",
              "2026-08-01 163310.png",
              "2026-08-01 163338.png",
              "2026-08-01 163405.png",
              "2026-08-01 163429.png",
              "2026-08-01 163451.png",
              "2026-08-01 163515.png",
              "2026-08-01 163551.png",
              "2026-08-01 163617.png",
              "2026-08-01 163640.png",
              "2026-08-01 163703.png",
            ];
            return (
              <div style={{padding:'10px 10px 20px', display:'flex', flexDirection:'column', gap:'10px'}}>
                <div style={{fontSize:'12px', fontWeight:700, color:'#b45309', padding:'4px 4px 0'}}>🏆 Adora Cruise Challenge</div>
                {files.map((f, i) => {
                  const url = base + encodeURIComponent(f);
                  return (
                    <img key={i}
                      src={url}
                      alt={`Challenge slide ${i + 1}`}
                      data-poster={url}
                      style={{width:'100%', borderRadius:'10px', display:'block', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.12)'}}
                    />
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/agent-app.js?v=20260812w" suppressHydrationWarning />
      {/* Combo lot module — isolated, removable without touching agent-app.js logic */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/agent-combo.js?v=20260806a"  suppressHydrationWarning />
      <script src="/agent-nlp.js?v=20260810a"     suppressHydrationWarning />
      <script src="/agent-n3.js?v=20260714"      suppressHydrationWarning />
      {/* Bundle promo module — Purchase with Purchase */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/agent-bundle.js?v=20260805f" suppressHydrationWarning />
      <style dangerouslySetInnerHTML={{ __html: `
        .nlp-panel { padding: 12px; }
        .nlp-panel-title { font-size: 13px; font-weight: 700; color: #1a3a6b; margin-bottom: 10px; text-align: center; }
        .nlp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .nlp-card { background: #fff; border: 2px solid #1a3a6b; border-radius: 10px; padding: 12px 10px; cursor: pointer; text-align: center; transition: background 0.15s; user-select: none; }
        .nlp-card:active { background: #e0eaff; }
        .nlp-card-name { font-size: 13px; font-weight: 700; color: #1a3a6b; margin-bottom: 2px; }
        .nlp-card-zh { font-size: 12px; font-weight: 700; color: #1a3a6b; margin-bottom: 5px; }
        .nlp-card-tier { display: inline-block; font-size: 10px; font-weight: 600; color: #b45309; background: rgba(255,255,255,0.6); border-radius: 4px; padding: 1px 6px; margin-bottom: 3px; }
        .nlp-card-religion { display: inline-block; font-size: 10px; font-weight: 600; color: #7c3aed; background: rgba(255,255,255,0.6); border-radius: 4px; padding: 1px 6px; margin-bottom: 6px; }
        .nlp-card-preneed { font-size: 14px; font-weight: 700; color: #0f172a; }
        .nlp-card-asneed { font-size: 11px; color: #64748b; margin-top: 2px; }
        .nz-combo { outline: 3px solid #F59E0B !important; outline-offset: -2px; }
        .nz-avail.nz-combo { background: #D97706 !important; color: #fff !important; }
        .nz-sold.nz-combo  { background: #78350F !important; color: #fff !important; opacity: 0.6; }
        .combo-legend { display:flex; align-items:center; gap:6px; font-size:12px; color:#92400E; margin-top:6px; }
        .combo-legend-dot { width:14px; height:14px; background:#D97706; border-radius:3px; flex-shrink:0; }
        .combo-row-badge { display:inline-block; margin-left:8px; padding:1px 6px; background:#F59E0B; color:#fff; border-radius:4px; font-size:10px; font-weight:700; vertical-align:middle; letter-spacing:0.3px; }
        .qt-combo-note td { font-size:11px; color:#92400E; padding:4px 8px; font-style:italic; }
        .nz-avail.nz-bundle { background: #0ea5e9 !important; color: #fff !important; }
        .bundle-trigger { margin-top: 12px; text-align: center; }
        .bundle-add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; background: #0284c7; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; letter-spacing: 0.2px; }
        .bundle-add-btn:hover { background: #0369a1; }
        .bundle-section { margin-top: 12px; border: 1.5px solid #0284c7; border-radius: 6px; overflow: hidden; }
        .bundle-section-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #0284c7; color: #fff; }
        .bundle-section-title { font-size: 12px; font-weight: 700; }
        .bundle-close-btn { background: transparent; border: 1px solid rgba(255,255,255,0.6); color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer; }
        .bundle-close-btn:hover { background: rgba(255,255,255,0.15); }
        .bundle-select-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f0f9ff; flex-wrap: wrap; }
        .bundle-select-label { font-size: 12px; font-weight: 600; color: #0369a1; white-space: nowrap; }
        .bundle-select { flex: 1; font-size: 12px; padding: 4px 8px; border: 1px solid #7dd3fc; border-radius: 4px; background: #fff; color: #0c4a6e; }
        .qt-total td { font-weight:700; border-top:2px solid #ccc; }
        .tdrplus td { background:#FEF08A !important; color:#713F12 !important; font-weight:700; }
      ` }} />
    </>
  );
}
