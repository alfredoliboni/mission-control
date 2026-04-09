import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getAgentWorkspacePath } from "@/lib/family-agents";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

/**
 * Resolves the workspace memory path from the request.
 * If ?agent=navigator-santos-sofia is provided and belongs to the user's family, use it.
 * Otherwise fall back to the family's first child (default behavior).
 */
function resolveWorkspacePath(agentParam: string | null, userEmail: string | undefined): string {
  const family = getFamilyAgent(userEmail);

  // If an agent param is provided, validate it belongs to this family
  if (agentParam) {
    const isValidAgent = family.children.some((c) => c.agentId === agentParam);
    if (isValidAgent) {
      return getAgentWorkspacePath(agentParam);
    }
  }

  // Default: first child's agent
  return getAgentWorkspacePath(family.children[0].agentId);
}

/**
 * GET /api/workspace-live?agent=navigator-santos-sofia
 * Lists .md files in the logged-in user's agent workspace on Orgo.ai VM.
 * Optional ?agent= param routes to a specific child's workspace.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const agentParam = request.nextUrl.searchParams.get("agent");
  const workspace = resolveWorkspacePath(agentParam, user?.email ?? undefined);

  if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
    return NextResponse.json({ error: "Orgo API not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(ORGO_API_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ORGO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command: `ls ${workspace}/*.md 2>/dev/null | xargs -I{} basename {} | sort`,
      }),
    });

    if (!response.ok) throw new Error(`Orgo API error: ${response.status}`);

    const result = await response.json();
    const files = (result.output || "")
      .split("\n")
      .map((f: string) => f.trim())
      .filter((f: string) => f.endsWith(".md"));

    return NextResponse.json(files);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list workspace files", details: String(err) },
      { status: 502 }
    );
  }
}
