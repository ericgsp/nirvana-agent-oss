import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // The locally-bundled mobile shell calls these API routes
              // cross-origin (capacitor://localhost -> the Vercel domain),
              // so every auth cookie needs SameSite=None to actually be
              // sent back on those requests -- SameSite=Lax (the library's
              // default) silently drops cookies on cross-site subrequests.
              // Harmless for the existing same-origin desktop admin pages;
              // None only relaxes the restriction, it never tightens it.
              cookieStore.set(name, value, { ...options, sameSite: "none", secure: true })
            );
          } catch {
            // Called from a Server Component — cookies can only be set from
            // Server Actions or Route Handlers, so this is a no-op here.
          }
        },
      },
    }
  );
}
