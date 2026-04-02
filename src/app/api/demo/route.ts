import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  response.cookies.set("companion-demo", "true", {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });
  return response;
}
