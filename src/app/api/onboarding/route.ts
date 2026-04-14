import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { execSync } from "child_process";

const HOME = process.env.HOME || process.env.USERPROFILE || "/root";
const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

/**
 * POST /api/onboarding
 * Creates a new family agent via OpenClaw CLI and sends the onboarding
 * profile to the agent via Gateway chat. The agent then creates all
 * workspace .md files from the profile data.
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

  // Derive agent name from child name or email
  const name = childName || familyName || user.email?.split("@")[0]?.split("+").pop() || "family";
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const agentId = `navigator-${slug}`;
  const workspaceDir = `${HOME}/.openclaw/workspace-${slug}`;

  try {
    // Step 1: Create the agent via OpenClaw CLI
    try {
      const result = execSync(
        `openclaw agents add "${agentId}" --workspace "${workspaceDir}" --non-interactive --json 2>&1`,
        { timeout: 30000, encoding: "utf-8" }
      );
      console.log(`[onboarding] Agent created: ${agentId}`, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Agent might already exist — that's OK
      if (!message.includes("already exists") && !message.includes("duplicate")) {
        console.error("[onboarding] Agent creation failed:", message);
        // Continue anyway — the workspace might already exist from manual setup
      }
    }

    // Step 2: Send the onboarding profile to the agent via Gateway
    if (COMPANION_API_DIRECT) {
      try {
        const prompt = `A new family just completed onboarding. Here is everything they shared about their child. Please:

1. Read all the information carefully
2. Create your workspace memory files based on what you learn:
   - child-profile.md — organize the profile data
   - pathway.md — determine their current stage and next steps
   - alerts.md — any immediate deadlines or actions needed
   - providers.md — note any providers mentioned, start searching for more
   - benefits.md — identify which Ontario benefits they should apply for
   - programs.md — find relevant programs in their area
   - journey-partners.md — note any care team members mentioned
3. Send a warm welcome message back to the family

Here is the onboarding data:

${profileMarkdown}`;

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
          const welcome = data.choices?.[0]?.message?.content || "Welcome! Your Navigator is setting up.";

          // Step 3: Update user metadata
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
      } catch (err) {
        console.error("[onboarding] Gateway error:", err);
      }
    }

    // Fallback: update metadata even if Gateway is unreachable
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
      welcome: "Welcome! Your Navigator is being set up. Please check back in a few minutes while we prepare your dashboard.",
    });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { error: "Failed to complete onboarding", details: String(err) },
      { status: 500 }
    );
  }
}
