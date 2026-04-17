import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

async function fetchDocumentManifest(familyId: string, agentId: string): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data: docs } = await admin
      .from("documents")
      .select("id, title, doc_type, uploaded_at, uploader_role")
      .eq("family_id", familyId)
      .eq("child_agent_id", agentId)
      .order("uploaded_at", { ascending: false })
      .limit(20);

    if (!docs || docs.length === 0) return "";

    const manifest = docs
      .map((d, i) =>
        `${i + 1}. ${d.title} (${d.doc_type}, uploaded ${new Date(d.uploaded_at).toISOString().slice(0, 10)} by ${d.uploader_role}) — id: ${d.id}`
      )
      .join("\n");

    return `\n\nDocuments on file for this child:\n${manifest}\n\nYou can reference these by title. For the full contents of a specific document, the family can use the "Ask Navigator" button on the document page.`;
  } catch (err) {
    console.error("[chat] document manifest fetch failed:", err);
    return "";
  }
}

async function sendToGateway(message: string, agentId: string = "main"): Promise<string> {
  if (!COMPANION_API_DIRECT) {
    throw new Error("Gateway not configured");
  }

  const response = await fetch(`${COMPANION_API_DIRECT}/v1/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(50000), // 50s timeout (Vercel function has 60s max)
    headers: {
      "Authorization": `Bearer ${COMPANION_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `openclaw/${agentId}`,
      messages: [{ role: "user", content: message }],
      user: agentId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status}`);
  }

  const result = await response.json();
  if (result.choices?.[0]?.message?.content) {
    return result.choices[0].message.content;
  }
  if (result.error?.message) {
    throw new Error(result.error.message);
  }
  return "I'm having trouble connecting. Please try again.";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message } = body as { message: string };

  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // If gateway is not configured, return a clear error
  if (!COMPANION_API_DIRECT) {
    return NextResponse.json({
      response: "Navigator agent is not connected. Please try again later.",
      fallback: true,
    });
  }

  // Get the logged-in user's email to route to their agent
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve agentId: trust ?agent= param from frontend, then metadata, then hardcoded map
  const agentParam = request.nextUrl.searchParams.get("agent");
  let agentId: string;
  if (agentParam) {
    agentId = agentParam;
  } else {
    const metadata = user.user_metadata || {};
    if (metadata.agent_id) {
      agentId = metadata.agent_id;
    } else {
      const { getFamilyAgent } = await import("@/lib/family-agents");
      const family = getFamilyAgent(user.email ?? undefined);
      agentId = family.children[0].agentId;
    }
  }

  try {
    const manifestContext = await fetchDocumentManifest(user.id, agentId);
    const augmentedMessage = manifestContext ? `${manifestContext}\n\n---\n\n${message}` : message;
    const agentResponse = await sendToGateway(augmentedMessage, agentId);
    return NextResponse.json({ response: agentResponse });
  } catch (err) {
    console.error("Gateway chat error:", err);
    return NextResponse.json({
      response: "Navigator agent is not connected. Please try again later.",
      fallback: true,
    });
  }
}
