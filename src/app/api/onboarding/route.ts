import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";

const HOME = process.env.HOME || process.env.USERPROFILE || "/root";
const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

/**
 * POST /api/onboarding
 * Sets up a new family:
 * 1. Creates workspace directory with child-profile.md + initial files
 * 2. Sends profile to Gateway so the agent can curate workspace files
 * 3. Updates user metadata with agent_id, role, child_name
 *
 * Note: workspace creation via fs only works on the Mac Mini (dev/local).
 * On Vercel, the workspace is created by sending the profile to the Gateway
 * which runs on the Mac Mini via Tailscale.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { profileMarkdown, childName, familyName } = body as {
    profileMarkdown: string;
    childName?: string;
    familyName?: string;
  };

  if (!profileMarkdown) {
    return NextResponse.json({ error: "Profile data required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = childName || familyName || user.email?.split("@")[0]?.split("+").pop() || "family";
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const agentId = `navigator-${slug}`;
  const workspaceDir = path.join(HOME, `.openclaw/workspace-${slug}`);
  const memoryDir = path.join(workspaceDir, "memory");

  // Try to create workspace locally (works on Mac Mini, not on Vercel)
  try {
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(path.join(memoryDir, "child-profile.md"), profileMarkdown, "utf-8");

    const today = new Date().toISOString().split("T")[0];
    const initialFiles: Record<string, string> = {
      "alerts.md": `# Alerts\n\nLast Updated: ${today}\n\n## Active\n\n_Your Navigator is setting up alerts for your family._\n`,
      "benefits.md": `# Benefits\n\nLast Updated: ${today}\n\n## Status Table\n\n| Benefit | Eligibility | Amount | Application Status |\n|---|---|---:|---|\n\n_Your Navigator is researching benefits for your family._\n`,
      "providers.md": `# Providers\n\nLast Updated: ${today}\n\n## Priority 1 - Current or Near-Term Needs\n\n_Your Navigator is searching for providers._\n`,
      "programs.md": `# Programs\n\nLast Updated: ${today}\n\n## Recommended Programs\n\n_Your Navigator is finding programs in your area._\n`,
      "pathway.md": `# Pathway\n\nLast Updated: ${today}\n\n## Current Stage: getting-started\n\n## Stages\n\n### 1. Getting Started [current]\n- [x] Completed onboarding — ${today}\n- [ ] Navigator reviewing profile\n- [ ] Initial provider search\n\n## Next Actions\n1. Your Navigator is reviewing your child's profile\n2. Check back soon for provider recommendations\n`,
      "ontario-system.md": `# Ontario Autism Services System\n\nLast Updated: ${today}\n\n## Timeline\n\n### 1. Diagnosis\nChild is assessed and receives ASD diagnosis.\n\n### 2. OAP Registration\nRegister with the Ontario Autism Program.\n\n### 3. Service Access\nAccess funded therapy and support services.\n`,
      "documents.md": `# Documents\n\nLast Updated: ${today}\n\n## All Documents\n\n| Date | Title | From | Type | Storage Link |\n|------|-------|------|------|-------------|\n`,
      "journey-partners.md": `# Journey Partners\n\nLast Updated: ${today}\n\n## Active Team\n\n_Invite providers and care team members to join your team._\n\n## Former Team\n`,
    };

    for (const [filename, content] of Object.entries(initialFiles)) {
      const filepath = path.join(memoryDir, filename);
      if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, content, "utf-8");
      }
    }

    // Create HEARTBEAT.md at workspace level
    const heartbeatPath = path.join(workspaceDir, "HEARTBEAT.md");
    if (!fs.existsSync(heartbeatPath)) {
      fs.writeFileSync(heartbeatPath, `# Heartbeat Tasks\n\nEvery heartbeat cycle:\n1. Check approaching deadlines (within 2 weeks)\n2. Search for providers matching child's needs\n3. Check for benefit/program updates\n4. Update alerts.md if anything new\n`, "utf-8");
    }
  } catch {
    // Filesystem not available (Vercel) — that's OK, Gateway will handle it
  }

  // Send profile to agent via Gateway (works from both local and Vercel)
  let welcome = "Welcome! Your Navigator is being set up. Check back in a few minutes.";
  if (COMPANION_API_DIRECT) {
    try {
      const prompt = `A new family just completed onboarding for ${childName || "their child"}. Process this intake data and set up their workspace files (child-profile.md, pathway.md, alerts.md, providers.md, benefits.md, programs.md, journey-partners.md). Here is their data:\n\n${profileMarkdown}`;

      const response = await fetch(`${COMPANION_API_DIRECT}/v1/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(55000),
        headers: {
          "Authorization": `Bearer ${COMPANION_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: `openclaw/${agentId}`,
          messages: [{ role: "user", content: prompt }],
          user: agentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        welcome = data.choices?.[0]?.message?.content || welcome;
      }
    } catch (err) {
      console.error("[onboarding] Gateway error:", err);
    }
  }

  // Update user metadata
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      role: "parent",
      full_name: familyName || user.user_metadata?.full_name,
      child_name: childName,
      agent_id: agentId,
    },
  });

  return NextResponse.json({
    success: true,
    agentId,
    welcome,
  });
}
