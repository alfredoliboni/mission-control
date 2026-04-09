import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgentFlat } from "@/lib/family-agents";
import { createAdminClient } from "@/lib/supabase/admin";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

/**
 * Fetch a single family's child profile from the agent workspace.
 */
async function fetchChildProfile(familyEmail: string) {
  const family = getFamilyAgentFlat(familyEmail);

  if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
    return {
      name: family.childName,
      age: "N/A",
      diagnosis: "Information not available",
      familyName: family.familyName,
    };
  }

  const filepath = `/root/.openclaw/workspace-${family.familyName.toLowerCase()}/memory/child-profile.md`;

  try {
    const response = await fetch(ORGO_API_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ORGO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command: `cat ${filepath} 2>/dev/null || echo "FILE_NOT_FOUND"`,
      }),
    });

    if (!response.ok) throw new Error(`Orgo API error: ${response.status}`);

    const result = await response.json();
    const content = result.output || "";

    if (content.trim() === "FILE_NOT_FOUND") {
      return {
        name: family.childName,
        age: "N/A",
        diagnosis: "Profile not yet created by family",
        familyName: family.familyName,
      };
    }

    const lines = content.split("\n");
    let name = family.childName;
    let age = "N/A";
    let diagnosis = "N/A";

    for (const line of lines) {
      const trimmed = line.trim();

      const kvMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase().trim();
        const value = kvMatch[2].trim();

        if (key === "name" || key === "child name" || key === "child's name") {
          name = value;
        } else if (key === "age" || key === "current age") {
          age = value;
        } else if (
          key === "diagnosis" ||
          key === "primary diagnosis" ||
          key === "diagnoses"
        ) {
          diagnosis = value;
        }
      }

      const tableMatch = trimmed.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/);
      if (tableMatch) {
        const key = tableMatch[1].toLowerCase().trim();
        const value = tableMatch[2].trim();

        if (
          key === "name" ||
          key === "child name" ||
          key === "child's name"
        ) {
          name = value;
        } else if (key === "age" || key === "current age") {
          age = value;
        } else if (
          key === "diagnosis" ||
          key === "primary diagnosis" ||
          key === "diagnoses"
        ) {
          diagnosis = value;
        }
      }
    }

    return { name, age, diagnosis, familyName: family.familyName };
  } catch (err) {
    console.error("Team profile error:", err);
    return {
      name: family.childName,
      age: "N/A",
      diagnosis: "Unable to load at this time",
      familyName: family.familyName,
    };
  }
}

/**
 * GET /api/team/profile
 * Returns ALL linked families for the stakeholder with child profiles.
 * Accepts optional ?family_id= to specify which family is active.
 * Response: { families: [...], activeFamily: {...} }
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

  // Fetch ALL stakeholder links for this user
  const { data: links, error: linkError } = await admin
    .from("stakeholder_links")
    .select("family_id")
    .eq("stakeholder_id", user.id);

  if (linkError || !links || links.length === 0) {
    return NextResponse.json(
      { error: "No linked family found" },
      { status: 404 }
    );
  }

  // For each linked family, fetch family user info and build profile
  const families = await Promise.all(
    links.map(async (link) => {
      const { data: familyUser } = await admin.auth.admin.getUserById(
        link.family_id
      );

      const email = familyUser?.user?.email || "";
      const agent = getFamilyAgentFlat(email);

      const profile = await fetchChildProfile(email);

      return {
        familyId: link.family_id,
        childName: profile.name,
        familyName: profile.familyName,
        agentId: agent.agentId,
        age: profile.age,
        diagnosis: profile.diagnosis,
      };
    })
  );

  // Determine active family from query param, default to first
  const requestedFamilyId = request.nextUrl.searchParams.get("family_id");
  const activeFamily =
    families.find((f) => f.familyId === requestedFamilyId) || families[0];

  // For backwards compatibility, also return flat fields from activeFamily
  return NextResponse.json({
    // New multi-family response
    families,
    activeFamily,
    // Legacy flat fields (so existing components don't break)
    name: activeFamily.childName,
    age: activeFamily.age,
    diagnosis: activeFamily.diagnosis,
    familyName: activeFamily.familyName,
  });
}
