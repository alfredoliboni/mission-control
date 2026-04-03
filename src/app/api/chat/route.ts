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

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: string; content: string }>;
  context?: { page?: string };
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const isDemoMode = cookieStore.get("companion-demo")?.value === "true";

  const body = (await request.json()) as ChatRequestBody;
  const { message, history, context } = body;

  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  if (isDemoMode) {
    // Simulate a slight delay for realism
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({
      response: getDemoResponse(message),
    });
  }

  // Production: proxy to OpenClaw Gateway via Orgo API
  const orgoComputerId = process.env.ORGO_COMPUTER_ID;
  const orgoApiKey = process.env.ORGO_API_KEY;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || "31494b4eb742aa2bf051e227bac2d42cca1182b954bb9de4";
  const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT || "18789";

  if (orgoComputerId && orgoApiKey) {
    try {
      // Build the chat payload for OpenClaw
      const chatPayload = JSON.stringify({
        message,
        history: history || [],
        context: context || {},
      });

      // Escape single quotes for shell
      const escapedPayload = chatPayload.replace(/'/g, "'\\''");

      const curlCmd = `curl -s -X POST -H "Authorization: Bearer ${gatewayToken}" -H "Content-Type: application/json" -d '${escapedPayload}' http://localhost:${gatewayPort}/api/v1/chat`;

      const orgoRes = await fetch(
        `https://www.orgo.ai/api/computers/${orgoComputerId}/bash`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${orgoApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command: curlCmd }),
        }
      );

      if (orgoRes.ok) {
        const orgoData = await orgoRes.json();
        const output = orgoData.output || orgoData.stdout || "";

        // Try to parse the gateway response
        try {
          const parsed = JSON.parse(output.trim());
          if (parsed.response || parsed.message || parsed.content) {
            return NextResponse.json({
              response: parsed.response || parsed.message || parsed.content,
            });
          }
        } catch {
          // If output isn't JSON, use it as plain text if non-empty
          if (output.trim().length > 0) {
            return NextResponse.json({ response: output.trim() });
          }
        }
      }
    } catch {
      // Fall through to demo response as fallback
    }
  }

  // Fallback: return demo-style response
  return NextResponse.json({
    response: getDemoResponse(message),
  });
}
