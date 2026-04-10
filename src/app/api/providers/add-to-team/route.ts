import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getAgentWorkspacePath } from "@/lib/family-agents";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

/**
 * POST /api/providers/add-to-team
 *
 * Takes provider data (from Supabase) and appends it to the family's
 * providers.md in the correct markdown format on the Orgo VM.
 *
 * Body: {
 *   agent: "navigator-santos",
 *   provider: {
 *     name, type, services, phone, email, website,
 *     waitlist_estimate, location_city, accepts_funding, ...
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent: agentParam, provider } = body;

    if (!provider?.name) {
      return NextResponse.json(
        { error: "Provider name is required" },
        { status: 400 }
      );
    }

    if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
      return NextResponse.json(
        { error: "Orgo API not configured" },
        { status: 503 }
      );
    }

    // Resolve workspace path
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const family = getFamilyAgent(user?.email ?? undefined);

    // Validate agent param belongs to this family
    let workspace: string;
    if (agentParam) {
      const isValidAgent = family.children.some(
        (c) => c.agentId === agentParam
      );
      if (isValidAgent) {
        workspace = getAgentWorkspacePath(agentParam);
      } else {
        workspace = getAgentWorkspacePath(family.children[0].agentId);
      }
    } else {
      workspace = getAgentWorkspacePath(family.children[0].agentId);
    }

    const filepath = `${workspace}/providers.md`;

    // Build the markdown block for the new provider
    const lines: string[] = [];
    lines.push(`#### ${provider.name}`);
    if (provider.type) lines.push(`- **Type:** ${provider.type}`);

    // Services: handle both array and string
    const services = Array.isArray(provider.services)
      ? provider.services.join(", ")
      : provider.services;
    if (services) lines.push(`- **Services:** ${services}`);

    lines.push(`- **Relevance:** Added by family via Mission Control`);

    if (provider.waitlist_estimate)
      lines.push(`- **Waitlist:** ${provider.waitlist_estimate}`);

    // Build contact line
    const contactParts: string[] = [];
    if (provider.phone) contactParts.push(provider.phone);
    if (provider.email) contactParts.push(provider.email);
    if (provider.website) contactParts.push(provider.website);
    if (contactParts.length > 0)
      lines.push(`- **Contact:** ${contactParts.join(" | ")}`);

    // Funding
    const funding = Array.isArray(provider.accepts_funding)
      ? provider.accepts_funding.join(", ")
      : provider.accepts_funding;
    if (funding) lines.push(`- **Funding:** ${funding}`);

    // Location note
    if (provider.location_city)
      lines.push(`- **Notes:** Located in ${provider.location_city}`);

    const mdBlock = lines.join("\n");

    // Append to providers.md using a heredoc-style append
    const command = `cat >> ${filepath} << 'PROVIDER_EOF'

${mdBlock}
PROVIDER_EOF`;

    const response = await fetch(ORGO_API_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ORGO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Orgo API error writing provider:", errText);
      return NextResponse.json(
        { error: "Failed to write to workspace" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${provider.name} added to your providers`,
    });
  } catch (error) {
    console.error("Add to team error:", error);
    return NextResponse.json(
      { error: "Failed to add provider to team" },
      { status: 500 }
    );
  }
}
