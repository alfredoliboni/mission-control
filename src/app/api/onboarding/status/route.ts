import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // ALWAYS check real filesystem state — never trust metadata status alone
  // (metadata can be stale if the agent didn't actually curate the data)
  const memoryPath = getAgentWorkspacePath(agentId); // returns .../memory
  const wsDir = path.dirname(memoryPath); // workspace root

  const workspaceCreated = fs.existsSync(wsDir);

  let filesCreated = 0;
  try {
    filesCreated = fs.readdirSync(memoryPath).filter((f: string) => f.endsWith(".md")).length;
  } catch { /* directory doesn't exist */ }

  const transcriptPath = path.join(memoryPath, "audio-transcript.md");
  const transcribed = fs.existsSync(transcriptPath);

  // Check gateway health
  let gatewayHealthy = false;
  try {
    const health = await fetch("http://localhost:18789/health", { signal: AbortSignal.timeout(3000) });
    gatewayHealthy = health.ok;
  } catch {}

  // Check curation state
  const curationRunning = fs.existsSync(path.join(wsDir, ".curation-running"));
  const curationComplete = fs.existsSync(path.join(wsDir, ".curation-complete"));
  const curationPending = fs.existsSync(path.join(wsDir, ".curation-pending"));
  void curationPending; // checked but not returned (used by curate endpoint)

  // Check if profile has real data (not just template)
  let profileReady = false;
  try {
    const profileContent = fs.readFileSync(path.join(memoryPath, "child-profile.md"), "utf-8");
    // Profile is ready if EITHER:
    // 1. Agent curated it (no more "To be assessed" placeholders), OR
    // 2. Fallback injected the transcript (has "Parent's Description" section)
    const agentCurated = !profileContent.includes("To be assessed") &&
                         !profileContent.includes("To be confirmed") &&
                         profileContent.split("\n").length > 25;
    const fallbackInjected = profileContent.includes("Parent's Description");
    profileReady = agentCurated || fallbackInjected;
  } catch { /* file doesn't exist */ }

  const status = profileReady ? "ready" : "processing";

  // When profile is ready, update metadata so layout-client can trust it on future visits
  if (profileReady && child.status === "processing") {
    try {
      const admin = createAdminClient();
      const freshChildren = children.map((c: { agentId: string; [key: string]: unknown }) =>
        c.agentId === agentId ? { ...c, status: "ready" } : c
      );
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, children: freshChildren },
      });
      console.log(`[onboarding/status] Profile ready — updated ${agentId} status to "ready"`);
    } catch (err) {
      console.error("[onboarding/status] Failed to update metadata:", err);
    }
  }

  return NextResponse.json({
    status,
    workspaceCreated,
    filesCreated: filesCreated > 0,
    fileCount: filesCreated,
    transcribed,
    profileReady,
    gatewayHealthy,
    curationTriggered: curationRunning || curationComplete,
    curationComplete,
    childName: child.childName,
    agentId,
  });
}
