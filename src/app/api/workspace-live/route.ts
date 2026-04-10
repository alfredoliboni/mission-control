import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getAgentWorkspacePath } from "@/lib/family-agents";
import fs from "fs";
import path from "path";

/**
 * GET /api/workspace-live?agent=navigator-santos-sofia
 * Lists .md files in the agent's local workspace.
 */
export async function GET(request: NextRequest) {
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

  // Resolve ~ to home dir
  const resolvedPath = workspacePath;

  try {
    const files = fs.readdirSync(resolvedPath)
      .filter((f) => f.endsWith(".md"))
      .sort();
    return NextResponse.json(files);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list workspace files", details: String(err) },
      { status: 502 }
    );
  }
}
