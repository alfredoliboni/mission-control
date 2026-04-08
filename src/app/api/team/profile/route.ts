import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent } from "@/lib/family-agents";
import { createAdminClient } from "@/lib/supabase/admin";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

/**
 * GET /api/team/profile
 * Returns the child profile for the stakeholder's linked family.
 * Reads stakeholder_links to find family_id, then fetches child-profile.md.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the stakeholder's linked family
  const admin = createAdminClient();
  const { data: links, error: linkError } = await admin
    .from("stakeholder_links")
    .select("family_id")
    .eq("stakeholder_id", user.id)
    .limit(1);

  if (linkError || !links || links.length === 0) {
    return NextResponse.json(
      { error: "No linked family found" },
      { status: 404 }
    );
  }

  const familyId = links[0].family_id;

  // Look up the family's email to find their agent workspace
  const { data: familyUser } = await admin.auth.admin.getUserById(familyId);

  if (!familyUser?.user?.email) {
    return NextResponse.json(
      { error: "Family account not found" },
      { status: 404 }
    );
  }

  const family = getFamilyAgent(familyUser.user.email);

  // Attempt to read child-profile.md from the agent workspace
  if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
    // Fallback: return basic info from the family agent mapping
    return NextResponse.json({
      name: family.childName,
      age: "N/A",
      diagnosis: "Information not available",
      familyName: family.familyName,
    });
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
      return NextResponse.json({
        name: family.childName,
        age: "N/A",
        diagnosis: "Profile not yet created by family",
        familyName: family.familyName,
      });
    }

    // Parse limited fields from child-profile.md
    // Format: "**Key:** Value" or "| Key | Value |"
    const lines = content.split("\n");
    let name = family.childName;
    let age = "N/A";
    let diagnosis = "N/A";

    for (const line of lines) {
      const trimmed = line.trim();

      // Match "**Name:** Alex Santos" format
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

      // Match "| Name | Alex Santos |" table format
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

    return NextResponse.json({
      name,
      age,
      diagnosis,
      familyName: family.familyName,
    });
  } catch (err) {
    console.error("Team profile error:", err);
    // Fallback
    return NextResponse.json({
      name: family.childName,
      age: "N/A",
      diagnosis: "Unable to load at this time",
      familyName: family.familyName,
    });
  }
}
