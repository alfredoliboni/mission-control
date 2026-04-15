import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWorkspaceBundle, type OnboardingData } from "@/lib/workspace/templates";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const WORKSPACE_FILE_SERVER = process.env.WORKSPACE_FILE_SERVER || "";
const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

/**
 * POST /api/onboarding
 * Creates a new family agent + workspace via the file server on Mac Mini,
 * then sends the profile to the Gateway so the agent can curate files.
 *
 * Flow: Vercel → File Server (Mac Mini via Tailscale) → openclaw agents add + workspace
 *       Vercel → Gateway (Mac Mini via Tailscale) → agent processes profile (fire-and-forget)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { profileMarkdown, childName, familyName, onboardingData, audioUrl } = body as {
    profileMarkdown: string;
    childName?: string;
    familyName?: string;
    onboardingData?: OnboardingData;
    audioUrl?: string;
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

  // Generate workspace bundle from templates
  const templateData: OnboardingData = onboardingData || {
    childName: name,
    familyName: familyName || name,
  };
  // Ensure names are set even if onboardingData was partial
  templateData.childName = templateData.childName || name;
  templateData.familyName = templateData.familyName || familyName || name;

  const workspaceBundle = generateWorkspaceBundle(templateData);

  // Step 1: Create agent + workspace via file server (runs on Mac Mini)
  if (WORKSPACE_FILE_SERVER) {
    try {
      const res = await fetch(`${WORKSPACE_FILE_SERVER}/create-agent`, {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: {
          "Authorization": `Bearer ${COMPANION_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId,
          profileMarkdown,
          childName: name,
          files: workspaceBundle,
          audioUrl: audioUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[onboarding] File server error:", err);
        return NextResponse.json({ error: "Failed to create workspace. Please try again." }, { status: 503 });
      }

      const data = await res.json();
      console.log("[onboarding] Agent created via file server:", data);
    } catch (err) {
      console.error("[onboarding] File server unreachable:", err);
      return NextResponse.json({ error: "Failed to create workspace. Please try again." }, { status: 503 });
    }
  } else {
    // Dev mode: create workspace locally
    try {
      const home = process.env.HOME || process.env.USERPROFILE || "/root";
      const wsDir = path.join(home, ".openclaw", `workspace-${slug}`);
      for (const [filename, content] of Object.entries(workspaceBundle)) {
        const filepath = path.join(wsDir, filename);
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
        fs.writeFileSync(filepath, content);
      }
      console.log(`[onboarding] Local workspace created: ${wsDir}`);

      // Try to register agent with OpenClaw
      try {
        execSync(`openclaw agents add ${agentId} --workspace ${wsDir}`, { timeout: 10000, stdio: "pipe" });
        console.log(`[onboarding] Agent registered: ${agentId}`);
      } catch (err) {
        console.error("[onboarding] Agent registration failed:", err);
      }
    } catch (err) {
      console.error("[onboarding] Local workspace creation failed:", err);
      return NextResponse.json({ error: "Failed to create workspace. Please try again." }, { status: 503 });
    }
  }

  // Step 1.5: Transcribe audio if provided
  let transcript = "";
  if (audioUrl) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_API_KEY) {
      try {
        // Download audio from Supabase Storage
        const audioRes = await fetch(audioUrl);
        if (audioRes.ok) {
          const audioBuffer = await audioRes.arrayBuffer();

          // Send to Whisper API
          const formData = new FormData();
          formData.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "onboarding.webm");
          formData.append("model", "whisper-1");
          formData.append("language", "pt"); // Portuguese

          const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
            body: formData,
            signal: AbortSignal.timeout(120000), // 2 min timeout for long audio
          });

          if (whisperRes.ok) {
            const result = await whisperRes.json();
            transcript = result.text || "";
            console.log("[onboarding] Audio transcribed:", transcript.slice(0, 100) + "...");
          }
        }
      } catch (err) {
        console.error("[onboarding] Whisper transcription failed:", err);
      }
    } else {
      console.warn("[onboarding] OPENAI_API_KEY not set — skipping transcription");
    }
  }

  // Step 2: Update user metadata — append to children array with status "processing"
  const admin = createAdminClient();
  const existingMeta = user.user_metadata || {};
  const existingChildren: Array<{ childName: string; agentId: string; status?: "processing" | "ready" }> = existingMeta.children
    ? [...existingMeta.children]
    : [];

  // Migrate from legacy single-child format if no children array yet
  if (existingChildren.length === 0 && existingMeta.agent_id) {
    existingChildren.push({
      childName: existingMeta.child_name || "Child",
      agentId: existingMeta.agent_id,
    });
  }

  // Add the new child with "processing" status
  existingChildren.push({ childName: name, agentId, status: "processing" });

  // Clean up large onboarding data from metadata (no longer needed)
  const { onboarding_completed, onboarding_profile, ...cleanMeta } = existingMeta;

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...cleanMeta,
      role: "parent",
      full_name: familyName || existingMeta.full_name,
      children: existingChildren,
      // Keep legacy fields pointing to first child for backward compat
      agent_id: existingChildren[0].agentId,
      child_name: existingChildren[0].childName,
    },
  });

  // Step 3: Send to agent — fire and forget (don't block the response)
  if (COMPANION_API_DIRECT) {
    const agentPrompt = transcript
      ? `A new family just completed AUDIO onboarding for ${name}. Transcription:\n\n---\n${transcript}\n---\n\nExtract all data, write child-profile.md, pathway.md, and use MCP tools for structured data.`
      : `A new family just completed onboarding for ${name}. Process this intake data:\n\n${profileMarkdown}`;

    // Fire and forget — update status to "ready" when done
    fetch(`${COMPANION_API_DIRECT}/v1/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(transcript ? 120000 : 55000),
      headers: {
        "Authorization": `Bearer ${COMPANION_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `openclaw/${agentId}`,
        messages: [{ role: "user", content: agentPrompt }],
        user: agentId,
      }),
    }).then(async () => {
      // Agent finished — update child status to "ready"
      try {
        const freshUser = await admin.auth.admin.getUserById(user.id);
        const freshMeta = freshUser.data.user?.user_metadata || {};
        const freshChildren = freshMeta.children || [];
        const updated = freshChildren.map((c: { agentId: string; [key: string]: unknown }) =>
          c.agentId === agentId ? { ...c, status: "ready" } : c
        );
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...freshMeta, children: updated }
        });
        console.log(`[onboarding] Agent finished for ${agentId}, status → ready`);
      } catch (err) {
        console.error("[onboarding] Failed to update status:", err);
      }
    }).catch((err) => {
      console.error("[onboarding] Gateway error (fire-and-forget):", err);
    });
  }

  // Return immediately — don't wait for agent
  return NextResponse.json({
    success: true,
    agentId,
    childName: name,
    status: "processing",
  });
}
