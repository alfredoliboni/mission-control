import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const DEMO_RESPONSES: Record<string, string> = {
  default:
    "I'm Alex's Navigator agent. I monitor Ontario's autism services, track applications, and find programs that can help while you wait. Ask me anything about Alex's pathway, benefits, or services!",
  wait: "Based on my last check (March 15), Pathways estimated 8 months for OT. That puts you around November 2026. I check weekly for updates. Want me to look into private OT options using the OAP budget once it's approved?",
  dtc: "The T2201 was mailed January 20. CRA typically responds in 6-8 weeks, so it's overdue at 9+ weeks. I recommend calling CRA at 1-800-959-8281 and referencing the T2201 filed for Alex Santos. Once approved, it unlocks the Child Disability Benefit ($3,173/yr) and the RDSP.",
  program:
    "I found 3 gap filler programs while you wait for funded therapy:\n\n1. **Autism Ontario Social Skills Group** — Free, Saturdays 10am-12pm, next session April 15\n2. **Fanshawe Sensory Play Program** — Free, Tues/Thurs 9:30-11am, open enrollment\n3. **Western Research Study** — Free + $50 compensation, recruiting until April 30\n\nWant me to register Alex for any of these?",
  help: "Here's what I can help with:\n\n- **Pathway status** — Where is Alex in the journey?\n- **Benefits** — DTC, RDSP, CDB status and next steps\n- **Providers** — Who's available, waitlists, and alternatives\n- **Programs** — Gap fillers and educational opportunities\n- **Alerts** — What needs your attention right now\n\nJust ask!",
};

function getDemoResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("wait") || lower.includes("ot") || lower.includes("long"))
    return DEMO_RESPONSES.wait;
  if (lower.includes("dtc") || lower.includes("tax") || lower.includes("cra"))
    return DEMO_RESPONSES.dtc;
  if (
    lower.includes("program") ||
    lower.includes("gap") ||
    lower.includes("filler")
  )
    return DEMO_RESPONSES.program;
  if (lower.includes("help") || lower.includes("what can"))
    return DEMO_RESPONSES.help;
  return DEMO_RESPONSES.default;
}

const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

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
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("companion-demo")?.value === "true";

  const body = await request.json();
  const { message } = body as { message: string };

  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Demo mode: simulated responses
  if (isDemo) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({
      response: getDemoResponse(message),
    });
  }

  // Production: direct connection to OpenClaw Gateway
  if (!COMPANION_API_DIRECT) {
    return NextResponse.json({
      response: getDemoResponse(message),
    });
  }

  // Get the logged-in user's email to route to their agent
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { getFamilyAgent } = await import("@/lib/family-agents");
  const family = getFamilyAgent(user.email ?? undefined);

  // Support ?agent= param for multi-child routing
  const agentParam = request.nextUrl.searchParams.get("agent");
  let agentId = family.children[0].agentId;
  if (agentParam) {
    const isValidAgent = family.children.some((c) => c.agentId === agentParam);
    if (isValidAgent) {
      agentId = agentParam;
    }
  }

  try {
    const agentResponse = await sendToGateway(message, agentId);
    return NextResponse.json({ response: agentResponse });
  } catch (err) {
    console.error("Gateway chat error:", err);
    // Fallback to demo-style response instead of error
    return NextResponse.json({
      response: getDemoResponse(message) + "\n\n_(Navigator is temporarily offline — this is a sample response)_",
    });
  }
}
