import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgentWorkspacePath } from "@/lib/family-agents";
import fs from "fs";
import path from "path";

type ConsolidateAction =
  | "provider_accepted"
  | "doctor_accepted"
  | "benefit_applied"
  | "program_enrolled"
  | "member_removed";

interface ConsolidateBody {
  action: ConsolidateAction;
  agentId: string;
  data: {
    name: string;
    role?: string;
    organization?: string;
    services?: string;
    contact?: string;
    email?: string;
    status?: string;
    reason?: string;
    amount?: string;
    type?: string;
    cost?: string;
    ages?: string;
    schedule?: string;
    location?: string;
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Journey Partners helpers ─────────────────────────────────────────────

function buildJourneyPartnerBlock(data: ConsolidateBody["data"]): string {
  const lines: string[] = [""];
  lines.push(`### ${data.name}`);
  if (data.role) lines.push(`- Role: ${data.role}`);
  if (data.organization) lines.push(`- Organization: ${data.organization}`);
  if (data.services) lines.push(`- Services: ${data.services}`);
  if (data.contact) lines.push(`- Contact: ${data.contact}`);
  lines.push(`- Status: Active since ${today()}`);
  lines.push(`- Source: Added via Mission Control, ${today()}`);
  lines.push("");
  return lines.join("\n");
}

function appendToJourneyPartnersActive(
  filepath: string,
  block: string
): void {
  if (!fs.existsSync(filepath)) {
    // Create new file with structure
    const content = `# Journey Partners\n\nLast Updated: ${today()}\n\n## Active Team\n${block}\n## Former Team\n`;
    fs.writeFileSync(filepath, content);
    return;
  }

  let content = fs.readFileSync(filepath, "utf-8");
  // Update Last Updated
  content = content.replace(
    /Last Updated: .+/,
    `Last Updated: ${today()}`
  );

  // Insert before "## Former Team" if it exists, otherwise append after "## Active Team"
  if (content.includes("## Former Team")) {
    content = content.replace(
      "## Former Team",
      `${block}\n## Former Team`
    );
  } else if (content.includes("## Active Team")) {
    content = content + block;
  } else {
    content = content + `\n## Active Team\n${block}`;
  }

  fs.writeFileSync(filepath, content);
}

function moveToFormerTeam(
  filepath: string,
  name: string,
  reason: string
): void {
  if (!fs.existsSync(filepath)) return;

  let content = fs.readFileSync(filepath, "utf-8");
  content = content.replace(
    /Last Updated: .+/,
    `Last Updated: ${today()}`
  );

  // Find the ### block for this member in Active Team
  const activeRegex = new RegExp(
    `(### ${escapeRegex(name)}\\n(?:- .+\\n?)*)`,
    "m"
  );
  const match = content.match(activeRegex);

  if (match) {
    // Remove from Active Team
    content = content.replace(match[0], "");

    // Build former block
    const formerBlock = [
      "",
      `### ${name}`,
      `- Role: ${extractField(match[0], "Role")}`,
      `- Status: Removed ${today()}`,
      `- Reason: ${reason || "Removed by family"}`,
      "",
    ].join("\n");

    // Insert into Former Team
    if (content.includes("## Former Team")) {
      content = content.replace(
        "## Former Team",
        `## Former Team\n${formerBlock}`
      );
    } else {
      content = content + `\n## Former Team\n${formerBlock}`;
    }
  }

  fs.writeFileSync(filepath, content);
}

function extractField(block: string, field: string): string {
  const regex = new RegExp(`- ${field}:\\s*(.+)`, "i");
  const match = block.match(regex);
  return match ? match[1].trim() : "";
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Provider helpers ─────────────────────────────────────────────────────

function buildProviderBlock(data: ConsolidateBody["data"]): string {
  const lines: string[] = [""];
  lines.push(`#### ${data.name}`);
  if (data.type) lines.push(`- **Type:** ${data.type}`);
  if (data.services) lines.push(`- **Services:** ${data.services}`);
  lines.push(`- **Relevance:** Added via consolidation, ${today()}`);
  if (data.contact) lines.push(`- **Contact:** ${data.contact}`);
  lines.push("");
  return lines.join("\n");
}

function removeFromProviders(filepath: string, name: string): void {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, "utf-8");

  // Remove #### block for this provider
  const regex = new RegExp(
    `\\n?#### ${escapeRegex(name)}\\n(?:- .+\\n?)*`,
    "m"
  );
  content = content.replace(regex, "");
  fs.writeFileSync(filepath, content);
}

// ── Benefit helpers ──────────────────────────────────────────────────────

function appendBenefitApplied(
  filepath: string,
  data: ConsolidateBody["data"]
): void {
  const block = [
    "",
    `### ${data.name}`,
    `- **Status:** Applied`,
    `- **Amount:** ${data.amount || "TBD"}`,
    `- **Applied:** ${today()}`,
    "",
  ].join("\n");

  if (!fs.existsSync(filepath)) {
    const content = `# Benefits\n\nLast Updated: ${today()}\n\n## Detailed Eligibility\n${block}`;
    fs.writeFileSync(filepath, content);
    return;
  }

  fs.appendFileSync(filepath, block);
}

// ── Program helpers ──────────────────────────────────────────────────────

function appendProgramEnrolled(
  filepath: string,
  data: ConsolidateBody["data"]
): void {
  const block = [
    "",
    `### ${data.name}`,
    `- **Type:** ${data.type || "Program"}`,
    `- **Cost:** ${data.cost || "TBD"}`,
    `- **Ages:** ${data.ages || "TBD"}`,
    `- **Schedule:** ${data.schedule || "TBD"}`,
    `- **Location:** ${data.location || "TBD"}`,
    `- **Status:** Enrolled ${today()}`,
    "",
  ].join("\n");

  if (!fs.existsSync(filepath)) {
    const content = `# Programs\n\nLast Updated: ${today()}\n\n## 📗 Programs\n${block}`;
    fs.writeFileSync(filepath, content);
    return;
  }

  fs.appendFileSync(filepath, block);
}

// ── Main handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: ConsolidateBody = await request.json();
    const { action, agentId, data } = body;

    if (!action || !agentId || !data?.name) {
      return NextResponse.json(
        { error: "action, agentId, and data.name are required" },
        { status: 400 }
      );
    }

    const workspace = getAgentWorkspacePath(agentId);
    const jpPath = path.join(workspace, "journey-partners.md");
    const provPath = path.join(workspace, "providers.md");
    const benPath = path.join(workspace, "benefits.md");
    const progPath = path.join(workspace, "programs.md");

    switch (action) {
      case "provider_accepted": {
        // Append to both providers.md and journey-partners.md Active Team
        const provBlock = buildProviderBlock(data);
        fs.appendFileSync(provPath, provBlock);

        const jpBlock = buildJourneyPartnerBlock(data);
        appendToJourneyPartnersActive(jpPath, jpBlock);
        break;
      }

      case "doctor_accepted": {
        // Append to journey-partners.md Active Team only
        const jpBlock = buildJourneyPartnerBlock(data);
        appendToJourneyPartnersActive(jpPath, jpBlock);
        break;
      }

      case "member_removed": {
        // Move from Active to Former in journey-partners.md, remove from providers.md
        moveToFormerTeam(
          jpPath,
          data.name,
          data.reason || "Removed by family"
        );
        removeFromProviders(provPath, data.name);
        break;
      }

      case "benefit_applied": {
        appendBenefitApplied(benPath, data);
        break;
      }

      case "program_enrolled": {
        appendProgramEnrolled(progPath, data);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${action} processed for ${data.name}`,
    });
  } catch (error) {
    console.error("Consolidate error:", error);
    return NextResponse.json(
      { error: "Failed to process consolidation" },
      { status: 500 }
    );
  }
}
