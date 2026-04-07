import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent } from "@/lib/family-agents";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

/**
 * POST /api/onboarding
 * Sends the onboarding data to the family's Navigator agent via chat.
 * The agent processes the intake and writes its own USER.md + memory files.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { profileMarkdown } = body as { profileMarkdown: string };

  if (!profileMarkdown) {
    return NextResponse.json({ error: "Profile data required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const family = getFamilyAgent(user?.email ?? undefined);

  if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
    return NextResponse.json({
      success: true,
      agentId: family.agentId,
      mode: "local",
    });
  }

  // Send onboarding data to the agent as a chat message.
  // The agent will process it and create/update USER.md, pathway.md, etc.
  const prompt = `A new family just completed onboarding. Here is everything they shared about their child. Please:

1. Read all the information carefully
2. Update your USER.md with a well-organized profile of this child and family
3. Create initial memory files based on what you learn:
   - pathway.md — determine their current stage and next steps
   - alerts.md — any immediate deadlines or actions needed
   - providers.md — start searching for relevant providers in their area
   - benefits.md — identify which benefits they should apply for
4. Send a warm welcome message back to the family

Here is the onboarding data:

${profileMarkdown}`;

  const payload = JSON.stringify({
    model: `openclaw/${family.agentId}`,
    messages: [{ role: "user", content: prompt }],
    user: family.agentId,
  }).replace(/"/g, '\\"');

  const curlCmd = `curl -s -X POST -H "Authorization: Bearer ${COMPANION_API_TOKEN}" -H "Content-Type: application/json" -d "${payload}" http://localhost:18789/v1/chat/completions`;

  try {
    const response = await fetch(ORGO_API_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ORGO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command: curlCmd }),
    });

    if (!response.ok) {
      throw new Error(`Orgo API error: ${response.status}`);
    }

    const result = await response.json();
    const output = result.output || "";

    // Parse agent response
    let agentWelcome = "Welcome! Your Navigator is setting up your dashboard. This may take a moment.";
    try {
      const parsed = JSON.parse(output);
      if (parsed.choices?.[0]?.message?.content) {
        agentWelcome = parsed.choices[0].message.content;
      }
    } catch {
      // Use default welcome
    }

    return NextResponse.json({
      success: true,
      agentId: family.agentId,
      welcome: agentWelcome,
      mode: "production",
    });
  } catch (err) {
    console.error("Onboarding agent error:", err);
    return NextResponse.json(
      { error: "Failed to send to agent", details: String(err) },
      { status: 502 }
    );
  }
}
