import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const WORKSPACE_FILE_SERVER = process.env.WORKSPACE_FILE_SERVER || "";
const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

/**
 * POST /api/onboarding
 * Creates a new family agent + workspace via the file server on Mac Mini,
 * then sends the profile to the Gateway so the agent can curate files.
 *
 * Flow: Vercel → File Server (Mac Mini via Tailscale) → openclaw agents add + workspace
 *       Vercel → Gateway (Mac Mini via Tailscale) → agent processes profile
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[onboarding] Agent created via file server:", data);
      } else {
        const err = await res.text();
        console.error("[onboarding] File server error:", err);
      }
    } catch (err) {
      console.error("[onboarding] File server unreachable:", err);
    }
  }

  // Step 2: Send profile to agent via Gateway (agent curates the files)
  let welcome = "Welcome! Your Navigator is being set up. Check back in a few minutes.";
  if (COMPANION_API_DIRECT) {
    try {
      const prompt = `A new family just completed onboarding for ${name}. Process this intake data and enhance the workspace files (child-profile.md, pathway.md, alerts.md, providers.md, benefits.md, programs.md). Here is their data:\n\n${profileMarkdown}`;

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
