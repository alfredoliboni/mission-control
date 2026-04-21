import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgentFlat } from "@/lib/family-agents";

const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

/**
 * POST /api/agent/notify
 * Notifies the family's Navigator agent about an event (e.g., new document uploaded).
 * The agent will process the notification and update workspace files accordingly.
 * Fire-and-forget against the Mac mini Gateway.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, title, details } = body as {
    type: "document_uploaded" | "care_team_added" | "profile_updated";
    title: string;
    details?: string;
  };

  if (!type || !title) {
    return NextResponse.json({ error: "type and title required" }, { status: 400 });
  }

  const family = getFamilyAgentFlat(user.email ?? undefined);

  if (!COMPANION_API_DIRECT) {
    return NextResponse.json({ success: true, mode: "local" });
  }

  const messages: Record<string, string> = {
    document_uploaded: `A new document was uploaded to the family's vault: "${title}". ${details || ""} Please review and update the relevant workspace files — update documents.md with a summary, check if child-profile.md or alerts.md need updates based on the document content.`,
    care_team_added: `A new care team member was added: "${title}". ${details || ""} Please update the journey partners section in child-profile.md.`,
    profile_updated: `The family updated their profile: "${title}". ${details || ""} Please review and update USER.md and child-profile.md accordingly.`,
  };

  const prompt = messages[type] || `Notification: ${type} — ${title}. ${details || ""}`;

  fetch(`${COMPANION_API_DIRECT}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${COMPANION_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `openclaw/${family.agentId}`,
      messages: [{ role: "user", content: prompt }],
      user: family.agentId,
    }),
  }).catch(() => {
    // Silently fail — agent notification is best-effort
  });

  return NextResponse.json({ success: true, agentId: family.agentId });
}
