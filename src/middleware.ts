import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/demo", "/onboarding", "/api/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/api/"))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/demo-data") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for demo mode cookie — demo users bypass auth entirely
  const isDemo = request.cookies.get("companion-demo")?.value === "true";
  if (isDemo) {
    return NextResponse.next();
  }

  // Refresh Supabase auth session (rewrites cookies if token refreshed)
  const response = await updateSession(request);

  // Check if user has a valid session after refresh
  // We look for the Supabase auth cookie presence as a fast check.
  // The actual session validation happens in updateSession via getUser().
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
