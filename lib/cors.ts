import { NextRequest, NextResponse } from "next/server";

// The locally-bundled mobile shell runs from a capacitor://localhost (iOS)
// or https://localhost (Android WebView default) origin -- distinct from
// the Vercel domain that serves these API routes, so calls from the
// bundled app are genuinely cross-origin. Desktop admin pages stay
// same-origin as always and don't need this.
function isAllowedOrigin(origin: string): boolean {
  return (
    origin === "https://localhost" ||
    origin === "capacitor://localhost" ||
    origin === "http://localhost" ||
    origin.startsWith("http://localhost:")
  );
}

export function corsHeaders(req: NextRequest): Headers {
  const origin = req.headers.get("origin") ?? "";
  const headers = new Headers();
  if (isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return headers;
}

export function corsPreflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export function corsJson(req: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  const headers = corsHeaders(req);
  if (init?.headers) {
    new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  }
  return NextResponse.json(body, { ...init, headers });
}
