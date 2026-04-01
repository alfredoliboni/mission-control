import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import fs from "fs";

const DEMO_FILES = [
  "child-profile.md",
  "pathway.md",
  "alerts.md",
  "providers.md",
  "programs.md",
  "benefits.md",
  "ontario-system.md",
  "documents.md",
  "messages.md",
];

export async function GET() {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("companion-demo")?.value === "true";

  if (isDemo) {
    return NextResponse.json(DEMO_FILES);
  }

  // Development mode: try to read from local workspace
  const workspacePath = process.env.WORKSPACE_MEMORY_PATH;
  if (workspacePath) {
    try {
      const files = fs
        .readdirSync(workspacePath)
        .filter((f) => f.endsWith(".md"));
      return NextResponse.json(files);
    } catch {
      return NextResponse.json(DEMO_FILES);
    }
  }

  // Fallback to demo data
  return NextResponse.json(DEMO_FILES);
}
