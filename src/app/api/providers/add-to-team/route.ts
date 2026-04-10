import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent, getAgentWorkspacePath } from "@/lib/family-agents";
import fs from "fs";

/**
 * POST /api/providers/add-to-team
 * Appends provider to the family's providers.md (local filesystem).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent: agentParam, provider } = body;

    if (!provider?.name) {
      return NextResponse.json({ error: "Provider name is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const family = getFamilyAgent(user.email ?? undefined);

    let workspace: string;
    if (agentParam && family.children.some((c) => c.agentId === agentParam)) {
      workspace = getAgentWorkspacePath(agentParam);
    } else {
      workspace = getAgentWorkspacePath(family.children[0].agentId);
    }

    const resolvedPath = workspace;
    const filepath = `${resolvedPath}/providers.md`;

    // Build markdown block
    const lines: string[] = [""];
    lines.push(`#### ${provider.name}`);
    if (provider.type) lines.push(`- **Type:** ${provider.type}`);
    const services = Array.isArray(provider.services) ? provider.services.join(", ") : provider.services;
    if (services) lines.push(`- **Services:** ${services}`);
    lines.push(`- **Relevance:** Added by family via Mission Control`);
    if (provider.waitlist_estimate) lines.push(`- **Waitlist:** ${provider.waitlist_estimate}`);
    const contactParts: string[] = [];
    if (provider.phone) contactParts.push(provider.phone);
    if (provider.email) contactParts.push(provider.email);
    if (provider.website) contactParts.push(provider.website);
    if (contactParts.length > 0) lines.push(`- **Contact:** ${contactParts.join(" | ")}`);
    const funding = Array.isArray(provider.accepts_funding) ? provider.accepts_funding.join(", ") : provider.accepts_funding;
    if (funding) lines.push(`- **Funding:** ${funding}`);
    if (provider.location_city) lines.push(`- **Notes:** Located in ${provider.location_city}`);
    lines.push("");

    // Append to providers.md
    fs.appendFileSync(filepath, lines.join("\n"));

    return NextResponse.json({ success: true, message: `${provider.name} added to your providers` });
  } catch (error) {
    console.error("Add to team error:", error);
    return NextResponse.json({ error: "Failed to add provider to team" }, { status: 500 });
  }
}
