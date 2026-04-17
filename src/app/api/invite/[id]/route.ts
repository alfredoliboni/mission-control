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
    .select("id, family_id, stakeholder_id, role, name, status, child_name")
    .eq("id", id)
    .single();

  if (error || !link) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  // Fetch family user to get family name
  let familyName = "The Family";
  const childName = link.child_name || "their child";

  const { data: familyUser } = await admin.auth.admin.getUserById(link.family_id);
  if (familyUser?.user) {
    familyName =
      familyUser.user.user_metadata?.full_name ||
      familyUser.user.email?.split("@")[0] ||
      "The Family";
  }

  // Does this invitee still need to set a password?
  let needsPassword = false;
  let email: string | null = null;
  if (link.stakeholder_id) {
    const { data: stakeholder } = await admin.auth.admin.getUserById(link.stakeholder_id);
    needsPassword = !!stakeholder?.user?.user_metadata?.needs_password_setup;
    email = stakeholder?.user?.email ?? null;
  }

  return NextResponse.json({
    id: link.id,
    role: link.role,
    stakeholderName: link.name,
    familyName,
    childName,
    status: link.status || "pending",
    needsPassword,
    email,
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
  const { status, password } = body as { status: string; password?: string };

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

  // Prevent re-changing after accepted/declined
  if (existing.status === "accepted" || existing.status === "declined") {
    return NextResponse.json(
      { error: `Invitation has already been ${existing.status}` },
      { status: 400 }
    );
  }

  // If accepting and the invitee still needs a password, validate + set it now
  if (status === "accepted" && existing.stakeholder_id) {
    const { data: stakeholderUser } = await admin.auth.admin.getUserById(existing.stakeholder_id);
    const needsPassword = !!stakeholderUser?.user?.user_metadata?.needs_password_setup;

    if (needsPassword) {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: "Password required (minimum 8 characters)" },
          { status: 400 }
        );
      }
      const existingMeta = stakeholderUser?.user?.user_metadata || {};
      const { needs_password_setup: _drop, ...cleanMeta } = existingMeta;
      const { error: pwErr } = await admin.auth.admin.updateUserById(existing.stakeholder_id, {
        password,
        user_metadata: cleanMeta,
      });
      if (pwErr) {
        return NextResponse.json({ error: pwErr.message }, { status: 500 });
      }
    }
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

    // Consolidate accepted invite into workspace journey-partners.md
    const { data: linkData } = await admin
      .from("stakeholder_links")
      .select("*")
      .eq("id", id)
      .single();

    if (linkData) {
      // Look up provider data from Supabase if it's a provider
      let providerData = null;
      const { data: provider } = await admin
        .from("providers")
        .select("*")
        .eq("email", linkData.email || "")
        .limit(1)
        .single();

      if (provider) {
        providerData = provider;
      }

      // Resolve agentId from family
      const { data: familyUser } = await admin.auth.admin.getUserById(linkData.family_id);
      const { getFamilyAgent } = await import("@/lib/family-agents");
      const family = getFamilyAgent(familyUser?.user?.email);
      const agentId = linkData.child_agent_id || family.children[0].agentId;

      // Consolidate into workspace
      try {
        const consolidateUrl = new URL("/api/consolidate", request.url);
        await fetch(consolidateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: providerData ? "provider_accepted" : "doctor_accepted",
            agentId,
            data: {
              name: linkData.name,
              role: linkData.role,
              organization: linkData.organization || linkData.name,
              services: providerData?.services?.join(", ") || "",
              contact: providerData?.phone || "",
              email: providerData?.email || linkData.email || "",
            },
          }),
        });
      } catch (err) {
        console.error("Consolidation error:", err);
        // Don't fail the invite accept if consolidation fails
      }
    }
  }

  return NextResponse.json({ success: true, invite: updated });
}
