import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/demo", "/onboarding", "/portal", "/reset-password", "/update-password", "/invite"];

// API routes that don't require authentication
const PUBLIC_API_PREFIXES = [
  "/api/demo",
  "/api/providers/search",
  "/api/providers/recommended",
  "/api/programs/search",
  "/api/portal/register",
  "/api/portal/employer",
  "/api/portal/university",
  "/api/invite/",
  "/api/onboarding",
  "/api/community/posts",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/demo-data") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // API routes: check if public or requires auth
  if (pathname.startsWith("/api/")) {
    const isPublicApi = PUBLIC_API_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p)
    );
    if (isPublicApi) {
      return NextResponse.next();
    }

    // Protected API: verify auth session
    const { user, supabaseResponse } = await updateSession(request);
    if (user) {
      return supabaseResponse;
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow public page paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Check for demo mode cookie
  const isDemo = request.cookies.get("companion-demo")?.value === "true";
  if (isDemo) {
    return NextResponse.next();
  }

  // Check Supabase auth session for protected pages
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
