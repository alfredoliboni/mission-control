import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getAgentWorkspacePath } from "@/lib/family-agents";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

/**
 * Resolves the workspace memory path from the request.
 * If ?agent= is provided and belongs to the user's family, use it.
 * Otherwise fall back to the family's first child.
 */
function resolveWorkspacePath(agentParam: string | null, userEmail: string | undefined): string {
  const family = getFamilyAgent(userEmail);

  if (agentParam) {
    const isValidAgent = family.children.some((c) => c.agentId === agentParam);
    if (isValidAgent) {
      return getAgentWorkspacePath(agentParam);
    }
  }

  return getAgentWorkspacePath(family.children[0].agentId);
}

/**
 * GET /api/workspace-live/[filename]?agent=navigator-santos-sofia
 * Reads a raw .md file from the logged-in user's agent workspace on Orgo.ai VM.
 * Optional ?agent= param routes to a specific child's workspace.
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
  const workspace = resolveWorkspacePath(agentParam, user?.email ?? undefined);
  const filepath = `${workspace}/${filename}`;

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
      body: JSON.stringify({ command: `cat ${filepath} 2>/dev/null || echo "FILE_NOT_FOUND"` }),
    });

    if (!response.ok) throw new Error(`Orgo API error: ${response.status}`);

    const result = await response.json();
    const content = result.output || "";

    if (content.trim() === "FILE_NOT_FOUND") {
      return new NextResponse("File not found", { status: 404 });
    }

    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read workspace file", details: String(err) },
      { status: 502 }
    );
  }
}
