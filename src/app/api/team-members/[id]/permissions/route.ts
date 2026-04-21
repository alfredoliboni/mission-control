import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/team-members/[id]/permissions
 * Revokes all document_permissions granted to this team member's stakeholder
 * account for documents owned by the calling family. The team member row
 * itself (family_team_members) is untouched — only the access grants are
 * deleted. Callers who also want to mark the member as former should do so
 * through the existing team-members remove flow.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: member, error: memberErr } = await admin
    .from("family_team_members")
    .select("id, stakeholder_user_id")
    .eq("id", id)
    .eq("family_id", user.id)
    .maybeSingle();

  if (memberErr) {
    console.error("team-members permissions lookup error:", memberErr);
    return NextResponse.json(
      { error: "Failed to look up team member" },
      { status: 500 }
    );
  }

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  if (!member.stakeholder_user_id) {
    return NextResponse.json({ success: true, revokedCount: 0 });
  }

  const { data: familyDocs, error: docsErr } = await admin
    .from("documents")
    .select("id")
    .eq("family_id", user.id);

  if (docsErr) {
    console.error("team-members permissions docs error:", docsErr);
    return NextResponse.json(
      { error: "Failed to load family documents" },
      { status: 500 }
    );
  }

  const docIds = (familyDocs ?? []).map((d) => d.id);
  if (docIds.length === 0) {
    return NextResponse.json({ success: true, revokedCount: 0 });
  }

  const { error: delErr, count } = await admin
    .from("document_permissions")
    .delete({ count: "exact" })
    .eq("stakeholder_id", member.stakeholder_user_id)
    .in("document_id", docIds);

  if (delErr) {
    console.error("team-members permissions delete error:", delErr);
    return NextResponse.json(
      { error: "Failed to revoke permissions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, revokedCount: count ?? 0 });
}
