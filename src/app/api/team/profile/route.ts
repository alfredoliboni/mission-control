import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgentFlat, getAgentWorkspacePath, getFamilyAgent } from "@/lib/family-agents";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePatientLinkId } from "@/lib/team/patient-link";
import fs from "fs";

/**
 * Read child profile from local workspace filesystem.
 */
function readChildProfile(agentId: string, familyName: string, childName: string) {
  const workspace = getAgentWorkspacePath(agentId);
  const filepath = `${workspace}/child-profile.md`;

  const fallback = {
    name: childName,
    age: "N/A",
    diagnosis: "Information not available",
    familyName,
  };

  try {
    if (!fs.existsSync(filepath)) return fallback;

    const content = fs.readFileSync(filepath, "utf-8");
    const lines = content.split("\n");

    let name = childName;
    let age = "N/A";
    let diagnosis = "N/A";

    for (const line of lines) {
      const trimmed = line.trim();
      // Match "- Key: Value" format
      const kvMatch = trimmed.match(/^-\s*(.+?):\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase().trim();
        const value = kvMatch[2].trim();
        if (key === "name" || key === "child name") name = value;
        else if (key === "age" || key === "current age") age = value;
        else if (key === "diagnosis" || key === "primary diagnosis" || key === "diagnoses") diagnosis = value;
      }
      // Match "**Key:** Value" format
      const boldMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.+)$/);
      if (boldMatch) {
        const key = boldMatch[1].toLowerCase().trim();
        const value = boldMatch[2].trim();
        if (key === "name" || key === "child name") name = value;
        else if (key === "age" || key === "current age") age = value;
        else if (key === "diagnosis" || key === "primary diagnosis" || key === "diagnoses") diagnosis = value;
      }
    }

    return { name, age, diagnosis, familyName };
  } catch (err) {
    console.error("Team profile read error:", err);
    return fallback;
  }
}

/**
 * GET /api/team/profile?patient=<linkId>
 * Returns a single patient profile for the authenticated stakeholder.
 * Selects by linkId (?patient=). Defaults to first link if omitted.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch ACCEPTED stakeholder links (include id for patient param lookup)
  const { data: links, error: linkError } = await admin
    .from("stakeholder_links")
    .select("id, family_id, child_name, child_agent_id, status")
    .eq("stakeholder_id", user.id)
    .or("status.eq.accepted,status.is.null");

  if (linkError || !links || links.length === 0) {
    return NextResponse.json(
      { error: "No linked family found" },
      { status: 403 }
    );
  }

  // Resolve which link to use. Supports compound linkIds: <realLinkId>__<childAgentId>
  const requestedLinkRaw = request.nextUrl.searchParams.get("patient");
  const parsed = requestedLinkRaw ? parsePatientLinkId(requestedLinkRaw) : null;
  let link: typeof links[number];

  if (parsed) {
    const found = links.find((l) => l.id === parsed.linkId);
    if (!found) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }
    link = found;
  } else {
    link = links[0];
  }

  // Resolve family name via admin auth + family-agents config
  const { data: familyUser } = await admin.auth.admin.getUserById(link.family_id);
  const email = familyUser?.user?.email || "";
  const metadata = familyUser?.user?.user_metadata || {};

  // Resolve agent ID: override from compound linkId > link row > family config default
  let agentId = parsed?.childAgentIdOverride || link.child_agent_id || "";
  let childName = link.child_name || "";

  // If we have an override agentId, try to pull childName from user_metadata.children
  if (parsed?.childAgentIdOverride) {
    const children = Array.isArray(metadata.children) ? metadata.children : [];
    const match = children.find(
      (c: { agentId?: string; childName?: string }) => c?.agentId === parsed.childAgentIdOverride
    );
    if (match?.childName) childName = match.childName;

    // Also check hardcoded FAMILY_AGENT_MAP as fallback
    if (!childName) {
      const agent = getFamilyAgent(email);
      const mapMatch = agent.children.find((c) => c.agentId === parsed.childAgentIdOverride);
      if (mapMatch) childName = mapMatch.childName;
    }
  }

  // Final fallback to family config defaults
  const family = getFamilyAgentFlat(email);
  if (!agentId) agentId = family.agentId;
  if (!childName) childName = family.childName;

  const profile = readChildProfile(agentId, family.familyName, childName || "Child");

  return NextResponse.json({
    family: {
      familyId: link.family_id,
      childName: profile.name,
      childAge: profile.age,
      diagnosis: profile.diagnosis,
      familyName: profile.familyName,
      agentId,
    },
    // Legacy flat fields for backwards compatibility
    name: profile.name,
    age: profile.age,
    diagnosis: profile.diagnosis,
    familyName: profile.familyName,
  });
}
