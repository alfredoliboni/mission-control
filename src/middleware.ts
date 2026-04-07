import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/demo", "/onboarding", "/portal"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public paths (exact match or prefix match)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
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

  // Check for demo mode cookie
  const isDemo = request.cookies.get("companion-demo")?.value === "true";
  if (isDemo) {
    return NextResponse.next();
  }

  // Check Supabase auth session
  const { user, supabaseResponse } = await updateSession(request);

  if (user) {
    return supabaseResponse;
  }

  // Not authenticated — redirect to login
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
