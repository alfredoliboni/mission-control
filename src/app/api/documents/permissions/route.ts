import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/documents/permissions?document_id=xxx
 * Returns sharing permissions for a document, joined with stakeholder names/roles.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = request.nextUrl.searchParams.get("document_id");
    const agentId = request.nextUrl.searchParams.get("agent_id");
    if (!documentId) {
      return NextResponse.json(
        { error: "document_id query parameter is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Active care-team members for this family with a backing auth user
    let membersQuery = admin
      .from("family_team_members")
      .select("id, stakeholder_user_id, name, role, agent_id")
      .eq("family_id", user.id)
      .eq("status", "active")
      .not("stakeholder_user_id", "is", null);

    if (agentId) {
      // Include per-child members AND family-wide members (agent_id IS NULL)
      membersQuery = membersQuery.or(`agent_id.eq.${agentId},agent_id.is.null`);
    }

    const { data: members, error: membersError } = await membersQuery;

    if (membersError) {
      console.error("Team members query error:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch care team" },
        { status: 500 }
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ permissions: [] });
    }

    const stakeholderIds = members.map((m) => m.stakeholder_user_id as string);
    const { data: existingPerms, error: permsError } = await admin
      .from("document_permissions")
      .select("stakeholder_id, can_view")
      .eq("document_id", documentId)
      .in("stakeholder_id", stakeholderIds);

    if (permsError) {
      console.error("Document permissions query error:", permsError);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    const permsMap = new Map(
      (existingPerms ?? []).map((p) => [p.stakeholder_id, p.can_view])
    );

    const permissions = members.map((m) => ({
      stakeholder_id: m.stakeholder_user_id as string,
      stakeholder_name: m.name,
      role: m.role,
      can_view: permsMap.get(m.stakeholder_user_id as string) ?? false,
    }));

    return NextResponse.json({ permissions });
  } catch (err) {
    console.error("Document permissions GET handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/permissions
 * Upserts a sharing permission for a document + stakeholder.
 * Body: { document_id, stakeholder_id, can_view: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { document_id, stakeholder_id, can_view } = body as {
      document_id: string;
      stakeholder_id: string;
      can_view: boolean;
    };

    if (!document_id || !stakeholder_id || typeof can_view !== "boolean") {
      return NextResponse.json(
        { error: "document_id, stakeholder_id, and can_view (boolean) are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify this stakeholder is an active team member of the user's family
    const { data: member } = await admin
      .from("family_team_members")
      .select("id")
      .eq("family_id", user.id)
      .eq("stakeholder_user_id", stakeholder_id)
      .eq("status", "active")
      .limit(1);

    if (!member || member.length === 0) {
      return NextResponse.json(
        { error: "Stakeholder is not on your care team" },
        { status: 403 }
      );
    }

    // Upsert permission
    const { error: upsertError } = await admin
      .from("document_permissions")
      .upsert(
        {
          document_id,
          stakeholder_id,
          can_view,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
        },
        { onConflict: "document_id,stakeholder_id" }
      );

    if (upsertError) {
      console.error("Document permission upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to update permission", details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Document permissions POST handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
