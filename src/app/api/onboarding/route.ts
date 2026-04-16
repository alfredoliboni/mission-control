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
 * Creates a new family agent + workspace via the file server on Mac Mini.
 * Writes a .curation-pending marker file — the processing page frontend
 * triggers curation via a separate POST to /api/onboarding/curate once the
 * gateway is healthy.
 *
 * Flow: Vercel → File Server (Mac Mini via Tailscale) → openclaw agents add + workspace
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

  console.log(`[onboarding] POST received — childName: ${childName}, audioUrl: ${audioUrl ? "YES (" + audioUrl.slice(0, 60) + "...)" : "NO"}, profileMarkdown: ${profileMarkdown?.slice(0, 50)}...`);

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
        try { execSync(`openclaw agents delete ${agentId} --force`, { timeout: 10000, stdio: "pipe" }); } catch {}
        execSync(`openclaw agents add ${agentId} --workspace ${wsDir}`, { timeout: 10000, stdio: "pipe" });
        console.log(`[onboarding] Agent registered: ${agentId}`);

        // Copy models.json and auth-profiles.json from main agent
        // New agents get wrong provider URLs by default — main agent has the correct ones
        const mainAgentDir = path.join(home, ".openclaw", "agents", "main", "agent");
        const newAgentDir = path.join(home, ".openclaw", "agents", agentId, "agent");
        for (const configFile of ["models.json", "auth-profiles.json"]) {
          const src = path.join(mainAgentDir, configFile);
          const dst = path.join(newAgentDir, configFile);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dst);
            console.log(`[onboarding] Copied ${configFile} from main agent`);
          }
        }

        // Restart gateway so it recognizes the new agent, then wait for it to be healthy
        console.log("[onboarding] Restarting gateway to load new agent...");
        execSync("openclaw gateway restart", { timeout: 60000, stdio: "pipe" });
        console.log("[onboarding] Gateway restart issued — waiting for health...");

        // Wait for gateway health only (not chat endpoint)
        const gwStart = Date.now();
        let gatewayReady = false;
        while (Date.now() - gwStart < 90000) {
          try {
            const health = await fetch("http://localhost:18789/health", { signal: AbortSignal.timeout(3000) });
            if (health.ok) {
              gatewayReady = true;
              console.log(`[onboarding] Gateway healthy after ${Math.round((Date.now() - gwStart) / 1000)}s`);
              break;
            }
          } catch {}
          await new Promise(r => setTimeout(r, 5000));
          console.log(`[onboarding] Waiting for gateway... ${Math.round((Date.now() - gwStart) / 1000)}s`);
        }
        if (!gatewayReady) {
          console.warn("[onboarding] Gateway not ready after 90s — curation will be triggered by frontend");
        }
      } catch (err) {
        console.error("[onboarding] Agent registration failed:", err);
      }
    } catch (err) {
      console.error("[onboarding] Local workspace creation failed:", err);
      return NextResponse.json({ error: "Failed to create workspace. Please try again." }, { status: 503 });
    }
  }

  // Step 1.5: Transcribe audio if provided (using local Whisper CLI)
  let transcript = "";
  console.log(`[onboarding] audioUrl: ${audioUrl ? audioUrl.slice(0, 80) + "..." : "NOT PROVIDED"}`);
  if (audioUrl) {
    try {
      // Download audio from Supabase Storage to temp file
      console.log(`[onboarding] Downloading audio...`);
      const audioRes = await fetch(audioUrl);
      console.log(`[onboarding] Audio download: ${audioRes.status}, size: ${audioRes.headers.get("content-length") || "unknown"}`);

      if (audioRes.ok) {
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
        const tmpAudio = path.join("/tmp", `onboarding-${Date.now()}.webm`);
        fs.writeFileSync(tmpAudio, audioBuffer);
        console.log(`[onboarding] Audio saved to: ${tmpAudio} (${audioBuffer.byteLength} bytes)`);

        // Transcribe with local Whisper CLI (Apple Silicon)
        console.log("[onboarding] Running local Whisper (model: small, language: pt)...");
        try {
          execSync(`whisper "${tmpAudio}" --model small --language pt --output_format txt --output_dir /tmp/`, {
            timeout: 300000, // 5 min for long audio
            stdio: "pipe",
          });

          // Read the output .txt file
          const txtFile = tmpAudio.replace(".webm", ".txt");
          if (fs.existsSync(txtFile)) {
            transcript = fs.readFileSync(txtFile, "utf-8").trim();
            console.log(`[onboarding] Transcript (${transcript.length} chars): ${transcript.slice(0, 200)}`);

            // Clean up temp files
            fs.unlinkSync(tmpAudio);
            fs.unlinkSync(txtFile);
          } else {
            console.error("[onboarding] Whisper ran but no .txt output found");
          }
        } catch (whisperErr) {
          console.error("[onboarding] Whisper CLI failed:", whisperErr);
        }

        // Save transcript to workspace
        if (transcript) {
          const transcriptPath = path.join(memoryDir, "audio-transcript.md");
          fs.writeFileSync(transcriptPath, `# Audio Onboarding Transcript\n\nTranscribed: ${new Date().toISOString().slice(0, 10)}\nAudio URL: ${audioUrl}\n\n---\n\n${transcript}\n`);
          console.log(`[onboarding] Transcript saved to: ${transcriptPath}`);
        }
      } else {
        console.error(`[onboarding] Audio download FAILED: ${audioRes.status}`);
      }
    } catch (err) {
      console.error("[onboarding] Transcription error:", err);
    }
  } else {
    console.log("[onboarding] No audioUrl — wizard mode, skipping transcription");
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

  // Write curation pending marker
  fs.writeFileSync(path.join(wsDir, ".curation-pending"), JSON.stringify({
    created: Date.now(),
    agentId,
    hasTranscript: !!transcript,
  }));
  console.log("[onboarding] Curation pending marker written");

  // Return immediately — don't wait for agent
  return NextResponse.json({
    success: true,
    agentId,
    childName: name,
    status: "processing",
  });
}
