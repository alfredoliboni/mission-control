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
    if (!documentId) {
      return NextResponse.json(
        { error: "document_id query parameter is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get care team members for this family
    const { data: stakeholders, error: stakeholderError } = await admin
      .from("stakeholder_links")
      .select("stakeholder_id, name, role")
      .eq("family_id", user.id);

    if (stakeholderError) {
      console.error("Stakeholder links query error:", stakeholderError);
      return NextResponse.json(
        { error: "Failed to fetch care team" },
        { status: 500 }
      );
    }

    if (!stakeholders || stakeholders.length === 0) {
      return NextResponse.json({ permissions: [] });
    }

    // Get existing permissions for this document
    const stakeholderIds = stakeholders.map((s) => s.stakeholder_id);
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

    // Build a lookup map for existing permissions
    const permsMap = new Map(
      (existingPerms ?? []).map((p) => [p.stakeholder_id, p.can_view])
    );

    // Merge: every stakeholder gets an entry, defaulting to can_view=false
    const permissions = stakeholders.map((s) => ({
      stakeholder_id: s.stakeholder_id,
      stakeholder_name: s.name,
      role: s.role,
      can_view: permsMap.get(s.stakeholder_id) ?? false,
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

    // Verify this stakeholder is linked to the user's family
    const { data: link } = await admin
      .from("stakeholder_links")
      .select("id")
      .eq("family_id", user.id)
      .eq("stakeholder_id", stakeholder_id)
      .limit(1);

    if (!link || link.length === 0) {
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
