import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/invite/[id]
 * Returns invite details (public — no auth required).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: link, error } = await admin
    .from("stakeholder_links")
    .select("id, family_id, role, name, status, child_name")
    .eq("id", id)
    .single();

  if (error || !link) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  // Fetch family user to get family name
  let familyName = "The Family";
  let childName = link.child_name || "their child";

  const { data: familyUser } = await admin.auth.admin.getUserById(link.family_id);
  if (familyUser?.user) {
    familyName =
      familyUser.user.user_metadata?.full_name ||
      familyUser.user.email?.split("@")[0] ||
      "The Family";
  }

  return NextResponse.json({
    id: link.id,
    role: link.role,
    stakeholderName: link.name,
    familyName,
    childName,
    status: link.status || "pending",
  });
}

/**
 * PATCH /api/invite/[id]
 * Updates invite status to "accepted" or "declined".
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
  }

  const body = await request.json();
  const { status } = body as { status: string };

  if (!status || !["accepted", "declined"].includes(status)) {
    return NextResponse.json(
      { error: 'status must be "accepted" or "declined"' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify the invite exists
  const { data: existing, error: fetchError } = await admin
    .from("stakeholder_links")
    .select("id, stakeholder_id, role, status")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  // Update the status
  const { data: updated, error: updateError } = await admin
    .from("stakeholder_links")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // When accepted, ensure user_metadata has is_stakeholder flag
  if (status === "accepted" && existing.stakeholder_id) {
    const { data: userData } = await admin.auth.admin.getUserById(existing.stakeholder_id);
    const existingMeta = userData?.user?.user_metadata || {};
    await admin.auth.admin.updateUserById(existing.stakeholder_id, {
      user_metadata: {
        ...existingMeta,
        is_stakeholder: true,
        stakeholder_role: existing.role,
      },
    });
  }

  return NextResponse.json({ success: true, invite: updated });
}
