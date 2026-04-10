import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getAgentWorkspacePath } from "@/lib/family-agents";
import fs from "fs";

/**
 * GET /api/workspace-live/[filename]?agent=navigator-santos-sofia
 * Reads a raw .md file from the agent's local workspace.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename.endsWith(".md")) {
    return NextResponse.json({ error: "Only .md files allowed" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const agentParam = request.nextUrl.searchParams.get("agent");

  const family = getFamilyAgent(user?.email ?? undefined);
  let workspacePath: string;

  if (agentParam && family.children.some((c) => c.agentId === agentParam)) {
    workspacePath = getAgentWorkspacePath(agentParam);
  } else {
    workspacePath = getAgentWorkspacePath(family.children[0].agentId);
  }

  const resolvedPath = workspacePath.replace("~", process.env.HOME || "/root");
  const filepath = `${resolvedPath}/${filename}`;

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }
}
