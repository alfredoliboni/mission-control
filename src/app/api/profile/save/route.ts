import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgentWorkspacePath } from "@/lib/family-agents";
import { profileToMarkdown } from "@/lib/workspace/profile-writer";
import type { ParsedProfile } from "@/types/workspace";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { agentId, profileData } = body as { agentId: string; profileData: ParsedProfile };

  if (!agentId || !profileData) {
    return NextResponse.json({ error: "agentId and profileData required" }, { status: 400 });
  }

  const memoryPath = getAgentWorkspacePath(agentId);
  const profilePath = path.join(memoryPath, "child-profile.md");

  try {
    const markdown = profileToMarkdown(profileData);
    fs.writeFileSync(profilePath, markdown);
    console.log(`[profile/save] Written ${markdown.length} chars to ${profilePath}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[profile/save] Failed:", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
