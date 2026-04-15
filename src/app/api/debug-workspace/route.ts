import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getAgentWorkspacePath } from "@/lib/family-agents";
import fs from "fs";

const WORKSPACE_FILE_SERVER = process.env.WORKSPACE_FILE_SERVER || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const agentParam = request.nextUrl.searchParams.get("agent") || "navigator-daniel-liboni";
  const debug: Record<string, unknown> = {
    step1_user: user ? { email: user.email, metadata_agent_id: user.user_metadata?.agent_id } : "NOT AUTHENTICATED",
    step2_agentParam: agentParam,
    step3_workspacePath: getAgentWorkspacePath(agentParam),
    step4_WORKSPACE_FILE_SERVER: WORKSPACE_FILE_SERVER ? "SET" : "NOT SET",
  };

  // Try filesystem
  const workspacePath = getAgentWorkspacePath(agentParam);
  try {
    const files = fs.readdirSync(workspacePath);
    debug.step5_filesystem = { status: "OK", files: files.filter(f => f.endsWith(".md")) };
  } catch (err) {
    debug.step5_filesystem = { status: "FAILED", error: String(err).slice(0, 100) };
  }

  // Try remote file server
  if (WORKSPACE_FILE_SERVER) {
    const url = `${WORKSPACE_FILE_SERVER}/files/${agentParam}`;
    try {
      const res = await fetch(url, {
        headers: COMPANION_API_TOKEN ? { Authorization: `Bearer ${COMPANION_API_TOKEN}` } : {},
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const files = await res.json();
        debug.step6_remote = { status: "OK", url, files };
      } else {
        debug.step6_remote = { status: "FAILED", url, httpStatus: res.status, body: await res.text().catch(() => "") };
      }
    } catch (err) {
      debug.step6_remote = { status: "ERROR", url, error: String(err).slice(0, 200) };
    }
  } else {
    debug.step6_remote = { status: "SKIPPED", reason: "WORKSPACE_FILE_SERVER not set" };
  }

  return NextResponse.json(debug, { headers: { "Cache-Control": "no-store" } });
}
