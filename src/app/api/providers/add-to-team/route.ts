import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email";

interface ChildMeta {
  agentId?: string;
  childName?: string;
}

function resolveChild(
  familyUser: { user_metadata?: Record<string, unknown> } | null,
  agentParam: string | undefined
): { childName?: string; childAgentId?: string } {
  const children = Array.isArray(familyUser?.user_metadata?.children)
    ? (familyUser!.user_metadata!.children as ChildMeta[])
    : [];

  if (agentParam) {
    const match = children.find((c) => c?.agentId === agentParam);
    if (match?.childName) {
      return { childName: match.childName, childAgentId: agentParam };
    }
    // agent param provided but not found in metadata — trust it, omit childName
    return { childAgentId: agentParam };
  }

  if (children.length === 1 && children[0]?.childName) {
    return {
      childName: children[0].childName,
      childAgentId: children[0].agentId,
    };
  }

  return {};
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent: agentParam, provider } = body;

    if (!provider?.name) {
      return NextResponse.json({ error: "Provider name is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const familyName = user.user_metadata?.family_name || user.user_metadata?.full_name || "Family";

    const { childName, childAgentId } = resolveChild(
      { user_metadata: user.user_metadata },
      agentParam
    );

    const providerEmail: string = provider.email || "";
    const providerRole: string = provider.type || "Provider";
    const providerOrg: string = provider.name;
    const catalogProviderId: string | undefined = provider.id;

    // Ensure the stakeholder has an auth account so they can accept the invite.
    let stakeholderId: string | null = null;
    if (providerEmail) {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: providerEmail,
        password: `Companion-${Math.random().toString(36).slice(2, 10)}!`,
        email_confirm: true,
        user_metadata: { needs_password_setup: true },
      });

      if (createError) {
        if (createError.message?.toLowerCase().includes("already been registered")) {
          const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
          const existingUser = existingUsers?.users?.find(
            (u) => u.email?.toLowerCase() === providerEmail.toLowerCase()
          );
          stakeholderId = existingUser?.id || null;
        } else {
          console.error("[add-to-team] createUser error:", createError);
        }
      } else {
        stakeholderId = newUser.user.id;
      }
    }

    // Duplicate check — same family + same child scope + same email already invited.
    if (providerEmail) {
      let dupQuery = admin
        .from("family_team_members")
        .select("id")
        .eq("family_id", user.id)
        .ilike("email", providerEmail);

      dupQuery = childAgentId
        ? dupQuery.eq("agent_id", childAgentId)
        : dupQuery.is("agent_id", null);

      const { data: existing } = await dupQuery.limit(1);
      if (existing && existing.length > 0) {
        const forChild = childName ? ` for ${childName}` : "";
        return NextResponse.json(
          { error: `This provider has already been invited${forChild}` },
          { status: 400 }
        );
      }
    }

    const memberPayload: Record<string, unknown> = {
      family_id: user.id,
      stakeholder_user_id: stakeholderId,
      name: provider.name,
      role: providerRole,
      organization: providerOrg,
      email: providerEmail || null,
      status: "pending",
    };
    if (childAgentId) memberPayload.agent_id = childAgentId;
    if (childName) memberPayload.child_name = childName;

    const { data: member, error: memberError } = await admin
      .from("family_team_members")
      .insert(memberPayload)
      .select("id")
      .single();

    if (memberError || !member) {
      console.error("[add-to-team] family_team_members insert failed:", memberError);
      return NextResponse.json(
        { error: memberError?.message || "Failed to create team member" },
        { status: 500 }
      );
    }

    // Link the catalog provider to the family (junction) when we know its id.
    if (catalogProviderId && childAgentId) {
      const { error: junctionError } = await admin
        .from("family_providers")
        .insert({
          family_id: user.id,
          provider_id: catalogProviderId,
          agent_id: childAgentId,
          provider_name: provider.name,
          priority: "relevant",
          status: "contacted",
        });
      if (junctionError) {
        console.error("[add-to-team] family_providers insert failed (non-fatal):", junctionError);
      }
    }

    // Send invite email (non-blocking). Link resolves to family_team_members.id.
    if (providerEmail) {
      const inviterName = user.user_metadata?.full_name || user.email || "A family";
      const resolvedChildName = childName || "their child";
      const origin = request.nextUrl.origin;
      const inviteUrl = `${origin}/invite/${member.id}`;

      sendInviteEmail({
        to: providerEmail,
        inviterName,
        childName: resolvedChildName,
        role: providerRole,
        inviteUrl,
      }).catch((err) => console.error("[add-to-team] Email send error:", err));
    }

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${provider.name}. They'll appear on your team once they accept.`,
      familyName,
    });
  } catch (error) {
    console.error("[add-to-team] unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite provider to team" },
      { status: 500 }
    );
  }
}
