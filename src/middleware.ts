import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/demo", "/onboarding", "/api/"];

export function middleware(request: NextRequest) {
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

  // Check for demo mode cookie
  const isDemo = request.cookies.get("companion-demo")?.value === "true";
  if (isDemo) {
    return NextResponse.next();
  }

  // For production, check Supabase auth session
  // For now, redirect unauthenticated users to login
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
