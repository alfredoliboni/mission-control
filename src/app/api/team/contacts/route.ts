import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePatientLinkId } from "@/lib/team/patient-link";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const linkRaw = request.nextUrl.searchParams.get("patient");
  if (!linkRaw) return NextResponse.json({ error: "patient required" }, { status: 400 });

  const parsed = parsePatientLinkId(linkRaw);
  const admin = createAdminClient();

  // Resolve the stakeholder's team-member row. linkId is family_team_members.id.
  const { data: memberRow } = await admin
    .from("family_team_members")
    .select("id, family_id, agent_id, child_name")
    .eq("id", parsed.linkId)
    .eq("stakeholder_user_id", user.id)
    .single();

  if (!memberRow) return NextResponse.json({ error: "Invalid patient" }, { status: 403 });

  const { data: familyUser } = await admin.auth.admin.getUserById(memberRow.family_id);
  const familyName = familyUser?.user?.user_metadata?.full_name || "Family";

  // Other team members scoped to the same child (plus family-wide members).
  let query = admin
    .from("family_team_members")
    .select("id, name, role, organization, stakeholder_user_id, email")
    .eq("family_id", memberRow.family_id)
    .eq("status", "active");

  if (memberRow.agent_id) {
    query = query.or(`agent_id.eq.${memberRow.agent_id},agent_id.is.null`);
  } else {
    query = query.is("agent_id", null);
  }

  const { data: teamMembers } = await query;

  const contacts = [
    {
      id: "family",
      userId: memberRow.family_id,
      name: familyName,
      role: "Family",
      organization: "",
    },
    ...(teamMembers || [])
      .filter((m) => m.stakeholder_user_id && m.stakeholder_user_id !== user.id)
      .map((m) => ({
        id: m.id,
        userId: m.stakeholder_user_id,
        name: m.name,
        role: m.role,
        organization: m.organization,
      })),
  ];

  return NextResponse.json({ contacts });
}
