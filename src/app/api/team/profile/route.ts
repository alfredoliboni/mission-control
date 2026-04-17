import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgentFlat, getAgentWorkspacePath } from "@/lib/family-agents";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Resolve which link to use
  const requestedLinkId = request.nextUrl.searchParams.get("patient");
  let link: typeof links[number];

  if (requestedLinkId) {
    const found = links.find((l) => l.id === requestedLinkId);
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
  const family = getFamilyAgentFlat(email);

  // Resolve agent ID (prefer link-level, fall back to family default)
  const agentId = link.child_agent_id || family.agentId;
  const childName = link.child_name || family.childName;

  const profile = readChildProfile(agentId, family.familyName, childName);

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
