import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getFamilyAgentFromMetadata, getAgentWorkspacePath } from "@/lib/family-agents";
import fs from "fs";

const WORKSPACE_FILE_SERVER = process.env.WORKSPACE_FILE_SERVER || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

/**
 * GET /api/workspace-live?agent=navigator-santos-sofia
 * Lists .md files in the agent's workspace.
 * Mode 1 (dev): reads from local filesystem
 * Mode 2 (Vercel): fetches from remote workspace file server
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentParam = request.nextUrl.searchParams.get("agent");

  // Resolve agentId: prefer query param, then metadata, then hardcoded map
  let agentId: string;
  if (agentParam) {
    // Frontend knows the correct agent — trust it
    agentId = agentParam;
  } else {
    // Resolve from metadata or hardcoded map
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
  try {
    const files = fs.readdirSync(workspacePath)
      .filter((f) => f.endsWith(".md"))
      .sort();
    console.log(`[workspace-live] LOCAL OK: ${agentId} → ${files.length} files from ${workspacePath}`);
    return NextResponse.json(files);
  } catch {
    console.log(`[workspace-live] LOCAL FAIL: ${agentId} → fs not available at ${workspacePath}, trying remote...`);
  }

  // Mode 2: Remote workspace file server (Vercel/production)
  if (WORKSPACE_FILE_SERVER) {
    const url = `${WORKSPACE_FILE_SERVER}/files/${agentId}`;
    try {
      const headers: Record<string, string> = {};
      if (COMPANION_API_TOKEN) {
        headers["Authorization"] = `Bearer ${COMPANION_API_TOKEN}`;
      }
      console.log(`[workspace-live] REMOTE: fetching ${url}`);
      const res = await fetch(url, { headers });
      if (res.ok) {
        const files = await res.json();
        console.log(`[workspace-live] REMOTE OK: ${agentId} → ${files.length} files`);
        return NextResponse.json(files);
      }
      console.error(`[workspace-live] REMOTE FAIL: ${url} → HTTP ${res.status}`);
    } catch (err) {
      console.error(`[workspace-live] REMOTE ERROR: ${url} →`, err);
    }
  } else {
    console.error(`[workspace-live] NO REMOTE: WORKSPACE_FILE_SERVER not set`);
  }

  // Fallback
  console.error(`[workspace-live] FALLBACK: returning default file list for ${agentId}`);
  return NextResponse.json([
    "alerts.md", "benefits.md", "child-profile.md", "documents.md",
    "ontario-system.md", "pathway.md", "programs.md", "providers.md",
  ]);
}
