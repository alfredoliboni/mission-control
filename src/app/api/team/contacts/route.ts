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

  const { data: linkRow } = await admin
    .from("stakeholder_links")
    .select("id, family_id, child_agent_id, child_name")
    .eq("id", parsed.linkId)
    .eq("stakeholder_id", user.id)
    .single();

  if (!linkRow) return NextResponse.json({ error: "Invalid patient" }, { status: 403 });

  // Family entry (always first) + resolve effective child name from metadata if compound
  const { data: familyUser } = await admin.auth.admin.getUserById(linkRow.family_id);
  const familyName = familyUser?.user?.user_metadata?.full_name || "Family";

  let effectiveChildName = linkRow.child_name;
  if (parsed.childAgentIdOverride) {
    const children = Array.isArray(familyUser?.user?.user_metadata?.children)
      ? familyUser!.user!.user_metadata!.children
      : [];
    const match = children.find(
      (c: { agentId?: string; childName?: string }) =>
        c?.agentId === parsed.childAgentIdOverride
    );
    if (match?.childName) effectiveChildName = match.childName;
  }

  // Other team members for this child
  const { data: teamMembers } = await admin
    .from("family_team_members")
    .select("id, name, role, organization, stakeholder_user_id, email")
    .eq("family_id", linkRow.family_id)
    .eq("status", "active")
    .or(`child_name.eq.${effectiveChildName || ""},child_name.is.null`);

  const contacts = [
    {
      id: "family",
      userId: linkRow.family_id,
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
