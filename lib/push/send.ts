import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

// Lazily initialized so a missing FIREBASE_SERVICE_ACCOUNT env var doesn't
// crash routes that don't send push (most of the app) -- it only matters
// the moment something actually tries to send.
let app: App | null = null;
function getFirebaseApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  const serviceAccount = JSON.parse(raw);
  app = initializeApp({ credential: cert(serviceAccount) });
  return app;
}

// Sends a push notification to every registered device (company-wide, per
// the user's explicit choice over team-scoped). Best-effort: prunes tokens
// FCM reports as invalid/unregistered, but a send failure otherwise never
// throws back into the caller -- the in-app activity feed (already built)
// is the reliable channel, push is a bonus on top.
export async function sendPushToAll(title: string, body: string, data?: Record<string, string>) {
  const { data: rows, error } = await supabaseAdmin
    .from("push_tokens")
    .select("id, token");
  if (error || !rows || !rows.length) return { sent: 0, failed: 0 };

  let messaging;
  try {
    messaging = getMessaging(getFirebaseApp());
  } catch (e) {
    console.error("Push notification send skipped:", e instanceof Error ? e.message : e);
    return { sent: 0, failed: 0 };
  }

  const tokens = rows.map((r) => r.token);
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: data ?? {},
    android: { priority: "high" },
  });

  // Clean up tokens FCM says are dead (uninstalled app, revoked, etc.) so
  // this list doesn't grow unbounded with stale entries.
  const deadTokenIds: string[] = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || "";
      if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
        deadTokenIds.push(rows[i].id);
      }
    }
  });
  if (deadTokenIds.length) {
    await supabaseAdmin.from("push_tokens").delete().in("id", deadTokenIds);
  }

  return { sent: res.successCount, failed: res.failureCount };
}
