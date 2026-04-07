import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent } from "@/lib/family-agents";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";

/**
 * POST /api/onboarding
 * Receives the onboarding profile markdown and writes it to the
 * family's agent workspace on the Orgo.ai VM as USER.md.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { profileMarkdown } = body as { profileMarkdown: string };

  if (!profileMarkdown) {
    return NextResponse.json({ error: "Profile markdown required" }, { status: 400 });
  }

  // Get the logged-in user to determine which agent workspace to write to
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const family = getFamilyAgent(user?.email ?? undefined);

  if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
    // Dev mode: just save locally
    return NextResponse.json({
      success: true,
      agentId: family.agentId,
      mode: "local",
    });
  }

  // Write USER.md to the agent's workspace on the VM
  const workspace = `~/.openclaw/workspace-${family.familyName.toLowerCase()}`;
  const escapedMarkdown = profileMarkdown.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");

  const writeCmd = `cat > ${workspace}/USER.md << 'ONBOARDING_EOF'\n${profileMarkdown}\nONBOARDING_EOF`;

  try {
    const response = await fetch(
      `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ORGO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: writeCmd }),
      }
    );

    if (!response.ok) {
      throw new Error(`Orgo API error: ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: result.success !== false,
      agentId: family.agentId,
      workspace,
      mode: "production",
    });
  } catch (err) {
    console.error("Onboarding write error:", err);
    return NextResponse.json(
      { error: "Failed to save profile to agent", details: String(err) },
      { status: 502 }
    );
  }
}
