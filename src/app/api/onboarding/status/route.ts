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
  if (!agentId) return NextResponse.json({ error: "agent param required" }, { status: 400 });

  // Find child in user metadata
  const children = user.user_metadata?.children || [];
  const child = children.find((c: { agentId: string }) => c.agentId === agentId);
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  // If already marked as ready in metadata, return immediately
  if (child.status === "ready" || !child.status) {
    return NextResponse.json({ status: "ready", childName: child.childName, agentId });
  }

  // Check if workspace has real data (child-profile.md has a real name)
  const workspacePath = getAgentWorkspacePath(agentId);
  const profilePath = path.join(workspacePath, "child-profile.md");

  try {
    const content = fs.readFileSync(profilePath, "utf-8");
    // Check if profile has been curated (has a real name, not template placeholder)
    const hasRealName = content.includes("## Basic Info") &&
      !content.includes("- **Name:** \n") &&
      !content.match(/- \*\*Name:\*\*\s*$/m);

    // Also check if the name in the profile is not the template default
    const nameMatch = content.match(/- \*\*Name:\*\*\s*(.+)/);
    const profileName = nameMatch ? nameMatch[1].trim() : "";
    const isTemplate = !profileName || profileName === child.childName; // same as what we set = uncurated

    // Consider ready if profile has been modified beyond the template
    // Simple heuristic: if the file has more than the template lines
    const lineCount = content.split("\n").length;
    const isReady = lineCount > 30 && !content.includes("To be assessed");

    // Suppress unused variable warnings
    void hasRealName;
    void isTemplate;

    if (isReady) {
      return NextResponse.json({ status: "ready", childName: child.childName, agentId });
    }
  } catch {
    // File doesn't exist yet — still processing
  }

  return NextResponse.json({ status: "processing", childName: child.childName, agentId });
}
