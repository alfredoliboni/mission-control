import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgentWorkspacePath } from "@/lib/family-agents";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CURATION_PROMPT = `You are performing automated curation after audio onboarding.

INPUT: memory/audio-transcript.md (already in your workspace)

EXECUTE THESE OPERATIONS IN ORDER:

STEP 1 — Read memory/audio-transcript.md
STEP 2 — Rewrite memory/child-profile.md with ALL extracted data:
  - name, date_of_birth, age, diagnosis, communication style
  - sensory profile, interests, strengths, challenges
  - Replace ALL "To be assessed" and "To be confirmed" placeholders
STEP 3 — Rewrite memory/pathway.md with the current journey stage
STEP 4 — For EACH doctor/therapist/provider mentioned, call add_team_member with your agent_id
STEP 5 — For EACH benefit mentioned (OAP, DTC, etc.), call add_benefit with your agent_id
STEP 6 — Call create_alert for any time-sensitive items

After ALL operations complete, respond with a summary of what was written.
Respond in Portuguese.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { agentId } = body as { agentId: string };
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  // Get workspace path
  const memoryPath = getAgentWorkspacePath(agentId);
  const wsDir = path.dirname(memoryPath);

  // Check lockfile — prevent duplicate curation
  const lockFile = path.join(wsDir, ".curation-running");
  const completeFile = path.join(wsDir, ".curation-complete");

  // If already complete, skip
  if (fs.existsSync(completeFile)) {
    return NextResponse.json({ triggered: false, reason: "already_complete" });
  }

  // Atomic lockfile check (wx = O_CREAT | O_EXCL)
  try {
    const fd = fs.openSync(lockFile, "wx");
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, started: Date.now() }));
    fs.closeSync(fd);
  } catch (e: any) {
    if (e.code === "EEXIST") {
      // Lock exists — check staleness (90s)
      try {
        const lock = JSON.parse(fs.readFileSync(lockFile, "utf-8"));
        if (Date.now() - lock.started > 90000) {
          // Stale lock — break it
          fs.unlinkSync(lockFile);
          console.log("[curate] Broke stale lockfile");
          // Try again
          const fd = fs.openSync(lockFile, "wx");
          fs.writeSync(fd, JSON.stringify({ pid: process.pid, started: Date.now() }));
          fs.closeSync(fd);
        } else {
          return NextResponse.json({ triggered: false, reason: "curation_in_progress" });
        }
      } catch {
        return NextResponse.json({ triggered: false, reason: "lock_check_failed" });
      }
    } else {
      return NextResponse.json({ triggered: false, reason: "lock_failed" }, { status: 500 });
    }
  }

  // Check gateway health first
  try {
    const health = await fetch("http://localhost:18789/health", { signal: AbortSignal.timeout(5000) });
    if (!health.ok) {
      fs.unlinkSync(lockFile);
      return NextResponse.json({ triggered: false, reason: "gateway_not_healthy" });
    }
  } catch {
    fs.unlinkSync(lockFile);
    return NextResponse.json({ triggered: false, reason: "gateway_unreachable" });
  }

  console.log(`[curate] Spawning openclaw agent for ${agentId}...`);

  // Spawn the CLI in detached mode
  const logFile = path.join(wsDir, "curation.log");
  const logFd = fs.openSync(logFile, "a");

  const child = spawn("openclaw", [
    "agent",
    "--agent", agentId,
    "--message", CURATION_PROMPT,
    "--json",
  ], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: { ...process.env, HOME: process.env.HOME },
  });

  child.unref();

  // When the child exits, write completion marker and clean lock
  child.on("exit", (code) => {
    console.log(`[curate] CLI exited with code ${code} for ${agentId}`);
    try { fs.unlinkSync(lockFile); } catch {}
    if (code === 0) {
      fs.writeFileSync(completeFile, JSON.stringify({ completed: Date.now(), pid: child.pid }));
    }
  });

  console.log(`[curate] Spawned PID ${child.pid} for ${agentId}`);

  return NextResponse.json({
    triggered: true,
    pid: child.pid,
    agentId,
  });
}
