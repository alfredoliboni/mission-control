import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgentWorkspacePath } from "@/lib/family-agents";
import fs from "fs";
import path from "path";

// GET /api/onboarding/status?agent=navigator-gustavo
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = request.nextUrl.searchParams.get("agent");
  if (!agentId) return NextResponse.json({ error: "agent required" }, { status: 400 });

  // Find child in metadata
  const children = user.user_metadata?.children || [];
  const child = children.find((c: { agentId: string }) => c.agentId === agentId);
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  // If already marked ready in metadata
  if (child.status === "ready" || !child.status) {
    return NextResponse.json({
      status: "ready",
      workspaceCreated: true,
      filesCreated: true,
      transcribed: true,
      profileReady: true,
      childName: child.childName,
      agentId,
    });
  }

  // Check real filesystem state
  const memoryPath = getAgentWorkspacePath(agentId); // returns .../memory
  const wsDir = path.dirname(memoryPath); // workspace root

  const workspaceCreated = fs.existsSync(wsDir);

  let filesCreated = 0;
  try {
    filesCreated = fs.readdirSync(memoryPath).filter((f: string) => f.endsWith(".md")).length;
  } catch { /* directory doesn't exist */ }

  const transcriptPath = path.join(memoryPath, "audio-transcript.md");
  const transcribed = fs.existsSync(transcriptPath);

  // Check if profile has real data (not template)
  let profileReady = false;
  try {
    const profileContent = fs.readFileSync(path.join(memoryPath, "child-profile.md"), "utf-8");
    profileReady = !profileContent.includes("To be assessed") &&
                   !profileContent.includes("To be confirmed") &&
                   profileContent.split("\n").length > 25;
  } catch { /* file doesn't exist */ }

  const status = profileReady ? "ready" : "processing";

  return NextResponse.json({
    status,
    workspaceCreated,
    filesCreated: filesCreated > 0,
    fileCount: filesCreated,
    transcribed,
    profileReady,
    childName: child.childName,
    agentId,
  });
}
