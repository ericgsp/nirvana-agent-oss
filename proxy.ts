import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// The locally-bundled mobile shell (capacitor://localhost / https://localhost)
// calls every /api/agent/* route cross-origin now. Most of those routes
// predate the bundling work and never had CORS headers -- applied here in
// one place instead of editing each route file individually, so nothing
// added later gets missed either.
function isAllowedOrigin(origin: string): boolean {
  return (
    origin === "https://localhost" ||
    origin === "capacitor://localhost" ||
    origin === "http://localhost" ||
    origin.startsWith("http://localhost:")
  );
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/agent/")) {
    const origin = request.headers.get("origin") ?? "";
    const allowed = isAllowedOrigin(origin);

    if (request.method === "OPTIONS") {
      const res = new NextResponse(null, { status: 204 });
      if (allowed) {
        res.headers.set("Access-Control-Allow-Origin", origin);
        res.headers.set("Access-Control-Allow-Credentials", "true");
        res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.headers.set("Access-Control-Allow-Headers", "Content-Type");
      }
      return res;
    }

    const res = NextResponse.next();
    if (allowed) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return res;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Agent routes and public assets are accessible without login
  const isAgentRoute =
    path === "/agent" ||
    path.startsWith("/agent/") ||
    path.startsWith("/api/agent/") ||
    path === "/agent-app.js" ||
    path === "/agent-sw.js" ||
    path === "/agent-manifest.json" ||
    path.startsWith("/agent-icon");

  if (!user && path !== "/login" && path !== "/signup" && !isAgentRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Run on all page routes except API routes and static assets, PLUS
// /api/agent/* specifically (for the CORS handling above -- other /api/*
// routes stay untouched since they're desktop-admin-only, never called
// cross-origin).
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/api/agent/:path*",
  ],
};
