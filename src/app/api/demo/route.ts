import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Use the request URL origin so it works on any deployment (Vercel, local, custom domain)
  const origin = request.nextUrl.origin;
  const response = NextResponse.redirect(new URL("/dashboard", origin));
  response.cookies.set("companion-demo", "true", {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });
  return response;
}
