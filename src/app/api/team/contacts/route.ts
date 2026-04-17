import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const linkId = request.nextUrl.searchParams.get("patient");
  if (!linkId) return NextResponse.json({ error: "patient required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: link } = await admin
    .from("stakeholder_links")
    .select("id, family_id, child_agent_id, child_name")
    .eq("id", linkId)
    .eq("stakeholder_id", user.id)
    .single();

  if (!link) return NextResponse.json({ error: "Invalid patient" }, { status: 403 });

  // Family entry (always first)
  const { data: familyUser } = await admin.auth.admin.getUserById(link.family_id);
  const familyName = familyUser?.user?.user_metadata?.full_name || "Family";

  // Other team members for this child
  const { data: teamMembers } = await admin
    .from("family_team_members")
    .select("id, name, role, organization, stakeholder_user_id, email")
    .eq("family_id", link.family_id)
    .eq("status", "active")
    .or(`child_name.eq.${link.child_name || ""},child_name.is.null`);

  const contacts = [
    {
      id: "family",
      userId: link.family_id,
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
