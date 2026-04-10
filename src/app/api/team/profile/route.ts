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
 * GET /api/team/profile
 * Returns ALL linked families for the stakeholder with child profiles.
 * Accepts optional ?family_id= to specify which family is active.
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

  // Fetch ACCEPTED stakeholder links
  const { data: links, error: linkError } = await admin
    .from("stakeholder_links")
    .select("family_id, child_name, child_agent_id, status")
    .eq("stakeholder_id", user.id)
    .or("status.eq.accepted,status.is.null");

  if (linkError || !links || links.length === 0) {
    return NextResponse.json(
      { error: "No linked family found" },
      { status: 404 }
    );
  }

  // For each linked family, fetch profile from local workspace
  const families = await Promise.all(
    links.map(async (link) => {
      const { data: familyUser } = await admin.auth.admin.getUserById(
        link.family_id
      );
      const email = familyUser?.user?.email || "";
      const family = getFamilyAgentFlat(email);

      // If this link is for a specific child, find the matching agent
      if (link.child_name) {
        // Try to find the child's agent ID from the link or family config
        const agentId = link.child_agent_id || family.agentId;
        const profile = readChildProfile(agentId, family.familyName, link.child_name);

        return {
          familyId: link.family_id,
          childName: link.child_name,
          familyName: family.familyName,
          agentId,
          age: profile.age,
          diagnosis: profile.diagnosis,
        };
      }

      // Legacy: no child_name means linked to whole family (first child)
      const profile = readChildProfile(family.agentId, family.familyName, family.childName);

      return {
        familyId: link.family_id,
        childName: profile.name,
        familyName: profile.familyName,
        agentId: family.agentId,
        age: profile.age,
        diagnosis: profile.diagnosis,
      };
    })
  );

  // Determine active family from query param, default to first
  const requestedFamilyId = request.nextUrl.searchParams.get("family_id");
  const activeFamily =
    families.find((f) => f.familyId === requestedFamilyId) || families[0];

  return NextResponse.json({
    families,
    activeFamily,
    // Legacy flat fields
    name: activeFamily.childName,
    age: activeFamily.age,
    diagnosis: activeFamily.diagnosis,
    familyName: activeFamily.familyName,
  });
}
