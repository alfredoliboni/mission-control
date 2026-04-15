import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getAgentWorkspacePath } from "@/lib/family-agents";
import fs from "fs";
import path from "path";

const WORKSPACE_FILE_SERVER = process.env.WORKSPACE_FILE_SERVER || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

/**
 * GET /api/workspace-live/[filename]?agent=navigator-{family}
 * Reads a raw .md file from the agent's workspace.
 * Mode 1 (dev): reads from local filesystem
 * Mode 2 (Vercel): fetches from remote workspace file server
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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentParam = request.nextUrl.searchParams.get("agent");

  // Resolve agentId: prefer query param, then metadata, then hardcoded map
  let agentId: string;
  if (agentParam) {
    agentId = agentParam;
  } else {
    const metadata = user.user_metadata || {};
    if (metadata.agent_id) {
      agentId = metadata.agent_id;
    } else {
      const family = getFamilyAgent(user.email ?? undefined);
      agentId = family.children[0].agentId;
    }
  }

  // Mode 1: Local filesystem (dev)
  const workspacePath = getAgentWorkspacePath(agentId);
  const filepath = path.join(workspacePath, filename);
  try {
    const content = fs.readFileSync(filepath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch {
    // Filesystem not available — try remote
  }

  // Mode 2: Remote workspace file server (Vercel/production)
  if (WORKSPACE_FILE_SERVER) {
    try {
      const headers: Record<string, string> = {};
      if (COMPANION_API_TOKEN) {
        headers["Authorization"] = `Bearer ${COMPANION_API_TOKEN}`;
      }
      const res = await fetch(`${WORKSPACE_FILE_SERVER}/files/${agentId}/${filename}`, { headers });
      if (res.ok) {
        const content = await res.text();
        return new NextResponse(content, {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        });
      }
    } catch (err) {
      console.error("Remote workspace file fetch error:", err);
    }
  }

  return new NextResponse("File not found", { status: 404 });
}
