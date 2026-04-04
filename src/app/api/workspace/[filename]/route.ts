import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("companion-demo")?.value === "true";

  if (!filename.endsWith(".md")) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (isDemo) {
    // Serve from public/demo-data/
    const filePath = path.join(process.cwd(), "public", "demo-data", filename);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return new NextResponse(content, {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  // Development mode: read from local workspace
  const workspacePath = process.env.WORKSPACE_MEMORY_PATH;
  if (workspacePath) {
    try {
      const filePath = path.join(workspacePath, filename);
      const content = fs.readFileSync(filePath, "utf-8");
      return new NextResponse(content, {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  // Fallback: serve from demo data
  const filePath = path.join(process.cwd(), "public", "demo-data", filename);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
