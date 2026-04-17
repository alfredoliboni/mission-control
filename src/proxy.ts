import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding", "/portal", "/reset-password", "/update-password", "/invite"];

// API routes that don't require authentication
const PUBLIC_API_PREFIXES = [
  "/api/providers/search",
  "/api/providers/recommended",
  "/api/providers/track-view",
  "/api/programs/search",
  "/api/portal/register",
  "/api/portal/employer",
  "/api/portal/university",
  "/api/invite/",
  "/api/onboarding",
  "/api/community/posts",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
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
    // Exclude file-upload routes so large multipart bodies don't hit
    // the 4MB Edge middleware body limit. These routes authenticate
    // the user themselves via supabase.auth.getUser().
    "/((?!_next/static|_next/image|favicon.ico|api/team/documents|api/documents/upload|.*\\..*$).*)",
  ],
};
