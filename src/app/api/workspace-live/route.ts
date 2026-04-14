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
  const { isKnownFamilyEmail } = await import("@/lib/family-agents");

  // Resolve agent: known family → hardcoded map, new user → metadata
  let family;
  if (isKnownFamilyEmail(user.email ?? undefined)) {
    family = getFamilyAgent(user.email ?? undefined);
  } else {
    const dynamic = getFamilyAgentFromMetadata(user.user_metadata || {});
    family = dynamic || getFamilyAgent(user.email ?? undefined);
  }

  let agentId: string;
  if (agentParam && family.children.some((c) => c.agentId === agentParam)) {
    agentId = agentParam;
  } else {
    agentId = family.children[0].agentId;
  }

  // Mode 1: Local filesystem (dev)
  const workspacePath = getAgentWorkspacePath(agentId);
  try {
    const files = fs.readdirSync(workspacePath)
      .filter((f) => f.endsWith(".md"))
      .sort();
    return NextResponse.json(files);
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
      const res = await fetch(`${WORKSPACE_FILE_SERVER}/files/${agentId}`, { headers });
      if (res.ok) {
        const files = await res.json();
        return NextResponse.json(files);
      }
    } catch (err) {
      console.error("Remote workspace fetch error:", err);
    }
  }

  // Fallback: return default file list
  return NextResponse.json([
    "alerts.md", "benefits.md", "child-profile.md", "documents.md",
    "ontario-system.md", "pathway.md", "programs.md", "providers.md",
  ]);
}
