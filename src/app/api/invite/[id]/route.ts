import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/invite/[id]
 * Returns invite details by family_team_members.id (public — no auth required).
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

  const { data: member, error } = await admin
    .from("family_team_members")
    .select("id, family_id, stakeholder_user_id, role, name, status, child_name")
    .eq("id", id)
    .single();

  if (error || !member) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  let familyName = "The Family";
  const childName = member.child_name || "their child";

  const { data: familyUser } = await admin.auth.admin.getUserById(member.family_id);
  if (familyUser?.user) {
    familyName =
      familyUser.user.user_metadata?.full_name ||
      familyUser.user.email?.split("@")[0] ||
      "The Family";
  }

  let needsPassword = false;
  let email: string | null = null;
  if (member.stakeholder_user_id) {
    const { data: stakeholder } = await admin.auth.admin.getUserById(member.stakeholder_user_id);
    needsPassword = !!stakeholder?.user?.user_metadata?.needs_password_setup;
    email = stakeholder?.user?.email ?? null;
  }

  return NextResponse.json({
    id: member.id,
    role: member.role,
    stakeholderName: member.name,
    familyName,
    childName,
    // Normalize status for frontend: pending → pending, active → accepted, declined → declined
    status:
      member.status === "active"
        ? "accepted"
        : member.status === "declined"
          ? "declined"
          : "pending",
    needsPassword,
    email,
  });
}

/**
 * PATCH /api/invite/[id]
 * Accepts or declines an invite. Resolves by family_team_members.id.
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

  const { data: existing, error: fetchError } = await admin
    .from("family_team_members")
    .select("id, family_id, stakeholder_user_id, role, status, agent_id, name, organization, email, child_name")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (existing.status === "active" || existing.status === "declined") {
    const label = existing.status === "active" ? "accepted" : "declined";
    return NextResponse.json(
      { error: `Invitation has already been ${label}` },
      { status: 400 }
    );
  }

  // Password setup for first-time invitees
  if (status === "accepted" && existing.stakeholder_user_id) {
    const { data: stakeholderUser } = await admin.auth.admin.getUserById(existing.stakeholder_user_id);
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
      const { error: pwErr } = await admin.auth.admin.updateUserById(existing.stakeholder_user_id, {
        password,
        user_metadata: cleanMeta,
      });
      if (pwErr) {
        return NextResponse.json({ error: pwErr.message }, { status: 500 });
      }
    }
  }

  const newStatus = status === "accepted" ? "active" : "declined";
  const timestamp = new Date().toISOString();

  const { data: updated, error: updateError } = await admin
    .from("family_team_members")
    .update({
      status: newStatus,
      accepted_at: status === "accepted" ? timestamp : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (status === "accepted" && existing.stakeholder_user_id) {
    const { data: userData } = await admin.auth.admin.getUserById(existing.stakeholder_user_id);
    const existingMeta = userData?.user?.user_metadata || {};
    await admin.auth.admin.updateUserById(existing.stakeholder_user_id, {
      user_metadata: {
        ...existingMeta,
        is_stakeholder: true,
        stakeholder_role: existing.role,
      },
    });

    let providerData: {
      services?: string[];
      phone?: string | null;
      email?: string | null;
    } | null = null;

    if (existing.email) {
      const { data: provider } = await admin
        .from("providers")
        .select("services, phone, email")
        .ilike("email", existing.email)
        .limit(1)
        .maybeSingle();
      if (provider) providerData = provider;
    }

    // Resolve agentId for consolidation. Prefer the row's agent_id; fall back to
    // the family's first child from user_metadata so legacy rows still consolidate.
    let agentId = existing.agent_id as string | null;
    if (!agentId) {
      const { data: familyUser } = await admin.auth.admin.getUserById(existing.family_id);
      const children = Array.isArray(familyUser?.user?.user_metadata?.children)
        ? (familyUser!.user!.user_metadata!.children as { agentId?: string }[])
        : [];
      agentId = children[0]?.agentId || null;
    }

    if (agentId) {
      try {
        const consolidateUrl = new URL("/api/consolidate", request.url);
        await fetch(consolidateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: providerData ? "provider_accepted" : "doctor_accepted",
            agentId,
            data: {
              name: existing.name,
              role: existing.role,
              organization: existing.organization || existing.name,
              services: providerData?.services?.join(", ") || "",
              contact: providerData?.phone || "",
              email: providerData?.email || existing.email || "",
            },
          }),
        });
      } catch (err) {
        console.error("Consolidation error:", err);
      }
    }
  }

  return NextResponse.json({ success: true, invite: updated });
}
