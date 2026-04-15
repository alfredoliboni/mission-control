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
 * Fallback curation: parse transcript and fill profile directly
 * when the Gateway agent is unavailable or fails.
 */
async function fallbackCurate(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  agentId: string,
  childName: string,
  transcript: string,
  memoryDir: string,
  templateData: OnboardingData
) {
  console.log("[onboarding] Fallback: parsing transcript and filling profile directly");

  // Basic transcript parsing
  const parsed = parseTranscriptBasic(transcript, childName);

  // Merge parsed data with template data
  const enrichedData: OnboardingData = {
    ...templateData,
    ...parsed,
    childName: childName,
  };

  // Rewrite child-profile.md with enriched data
  const { generateChildProfile } = await import("@/lib/workspace/templates");
  const profileContent = generateChildProfile(enrichedData);
  fs.writeFileSync(path.join(memoryDir, "child-profile.md"), profileContent);
  console.log("[onboarding] Fallback: child-profile.md updated with parsed data");

  // Update metadata status to ready
  const freshUser = await admin.auth.admin.getUserById(userId);
  const freshMeta = freshUser.data.user?.user_metadata || {};
  const freshChildren = freshMeta.children || [];
  const updated = freshChildren.map((c: { agentId: string; [key: string]: unknown }) =>
    c.agentId === agentId ? { ...c, status: "ready" } : c
  );
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...freshMeta, children: updated },
  });
  console.log("[onboarding] Fallback: status → ready");
}

function parseTranscriptBasic(transcript: string, _childName: string): Partial<OnboardingData> {
  const t = transcript.toLowerCase();
  const result: Partial<OnboardingData> = {};

  // Extract diagnosis
  const diagnoses: string[] = [];
  if (/autismo|autism|asd|tea/i.test(t)) diagnoses.push("ASD");
  if (/tdah|adhd/i.test(t)) diagnoses.push("ADHD");
  if (/ansiedade|anxiety/i.test(t)) diagnoses.push("Anxiety");
  if (diagnoses.length > 0) result.diagnosis = diagnoses.join(", ");

  // Extract interests
  const interestMatch = transcript.match(/(?:gosta de|loves?|adora|interesse[s]?[: ]+)([^.!?\n]+)/i);
  if (interestMatch) {
    result.interests = interestMatch[1].split(/[,e&]+/).map(s => s.trim()).filter(Boolean);
  }

  // Extract sensory
  const sensoryMatch = transcript.match(/(?:sensor|sensorial|sensory)[^.!?\n]+/i);
  if (sensoryMatch) result.sensoryProfile = sensoryMatch[0];

  // Extract communication
  const commMatch = transcript.match(/(?:verbal|não verbal|non.verbal|fala[^.]*|comunicação[^.]*)/i);
  if (commMatch) result.communicationStyle = commMatch[0];

  // Extract age/DOB
  const ageMatch = transcript.match(/(\d+)\s*(?:anos|years|meses|months)/i);
  if (ageMatch) result.age = ageMatch[0];

  return result;
}

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

  // Derive workspace paths once (used throughout)
  const home = process.env.HOME || process.env.USERPROFILE || "/root";
  const wsDir = path.join(home, ".openclaw", `workspace-${slug}`);
  const memoryDir = path.join(wsDir, "memory");

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
    // Dev mode: create workspace locally with verification
    try {
      // Ensure memory directory exists FIRST
      fs.mkdirSync(memoryDir, { recursive: true });

      // Write ALL template files
      let filesWritten = 0;
      for (const [filename, content] of Object.entries(workspaceBundle)) {
        const filepath = path.join(wsDir, filename);
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
        fs.writeFileSync(filepath, content);
        filesWritten++;
      }

      // VERIFY files were created
      const memoryFiles = fs.readdirSync(memoryDir).filter(f => f.endsWith(".md"));
      console.log(`[onboarding] Created ${filesWritten} files. Memory has ${memoryFiles.length} .md files at ${memoryDir}`);

      if (memoryFiles.length === 0) {
        return NextResponse.json({ error: "Workspace created but no memory files found" }, { status: 503 });
      }

      // Try to register agent with OpenClaw
      try {
        console.log(`[onboarding] Registering agent ${agentId} with workspace ${wsDir}`);
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

            // Save transcript to workspace using memoryDir (NOT re-derived path)
            if (transcript) {
              const transcriptPath = path.join(memoryDir, "audio-transcript.md");
              fs.writeFileSync(transcriptPath, `# Audio Onboarding Transcript\n\nTranscribed: ${new Date().toISOString().slice(0, 10)}\nAudio URL: ${audioUrl}\n\n---\n\n${transcript}\n`);

              // VERIFY transcript was saved
              if (fs.existsSync(transcriptPath)) {
                console.log(`[onboarding] Transcript saved: ${transcriptPath} (${transcript.length} chars)`);
              } else {
                console.error("[onboarding] FAILED to save transcript!");
              }
            }
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

  // Step 3: Send to agent — fire and forget with fallback
  if (COMPANION_API_DIRECT) {
    const agentPrompt = transcript
      ? `A new family just completed AUDIO onboarding for ${name}. Transcription:\n\n---\n${transcript}\n---\n\nExtract all data, write child-profile.md, pathway.md, and use MCP tools for structured data.`
      : `A new family just completed onboarding for ${name}. Process this intake data:\n\n${profileMarkdown}`;

    // Fire and forget with fallback on failure
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
    }).then(async (res) => {
      if (res.ok) {
        // Agent finished — update child status to "ready"
        try {
          const freshUser = await admin.auth.admin.getUserById(user.id);
          const freshMeta = freshUser.data.user?.user_metadata || {};
          const freshChildren = freshMeta.children || [];
          const updated = freshChildren.map((c: { agentId: string; [key: string]: unknown }) =>
            c.agentId === agentId ? { ...c, status: "ready" } : c
          );
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: { ...freshMeta, children: updated },
          });
          console.log(`[onboarding] Agent curated ${agentId}, status → ready`);
        } catch (err) {
          console.error("[onboarding] Failed to update status:", err);
        }
      } else {
        console.error("[onboarding] Gateway returned non-OK, using fallback");
        await fallbackCurate(admin, user.id, agentId, name, transcript, memoryDir, templateData);
      }
    }).catch(async (err) => {
      console.error("[onboarding] Gateway failed, using fallback:", err.message);
      // FALLBACK: parse transcript and fill profile directly
      await fallbackCurate(admin, user.id, agentId, name, transcript, memoryDir, templateData);
    });
  } else if (transcript) {
    // If no Gateway configured, use fallback immediately
    await fallbackCurate(admin, user.id, agentId, name, transcript, memoryDir, templateData);
  }

  // Return immediately — don't wait for agent
  return NextResponse.json({
    success: true,
    agentId,
    childName: name,
    status: "processing",
  });
}
