import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email";
import { getFamilyAgent } from "@/lib/family-agents";

/**
 * POST /api/providers/add-to-team
 * Creates a stakeholder_link entry (pending) and sends an invite email.
 * The provider will appear on the team once they accept the invite,
 * at which point the consolidation layer writes to journey-partners.md.
 */
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
    const family = getFamilyAgent(user.email ?? undefined);

    // Resolve child info from agent param
    let childName: string | undefined;
    let childAgentId: string | undefined;
    if (agentParam && family.children.some((c) => c.agentId === agentParam)) {
      const child = family.children.find((c) => c.agentId === agentParam);
      childName = child?.childName;
      childAgentId = agentParam;
    } else if (family.children.length > 1) {
      // Multi-child family — use first child as default
      childName = family.children[0].childName;
      childAgentId = family.children[0].agentId;
    }

    const providerEmail = provider.email || "";
    const providerRole = provider.type || "Provider";
    const providerOrg = provider.name; // Use provider name as organization

    // If provider has an email, try to create/find their auth account
    let stakeholderId: string | null = null;

    if (providerEmail) {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: providerEmail,
        password: "Companion2026!",
        email_confirm: true,
      });

      if (createError) {
        if (createError.message?.includes("already been registered")) {
          const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
          const existingUser = existingUsers?.users?.find((u) => u.email === providerEmail);
          stakeholderId = existingUser?.id || null;
        }
        // If other error, proceed without stakeholder_id (email-only invite)
      } else {
        stakeholderId = newUser.user.id;
      }
    }

    // Check for duplicate invite
    if (stakeholderId) {
      let duplicateQuery = admin
        .from("stakeholder_links")
        .select("id")
        .eq("family_id", user.id)
        .eq("stakeholder_id", stakeholderId);

      if (childName) {
        duplicateQuery = duplicateQuery.eq("child_name", childName);
      }

      const { data: existingLink } = await duplicateQuery.limit(1);
      if (existingLink && existingLink.length > 0) {
        const forChild = childName ? ` for ${childName}` : "";
        return NextResponse.json(
          { error: `This provider has already been invited${forChild}` },
          { status: 400 }
        );
      }
    }

    // Create stakeholder_link entry (pending)
    const insertPayload: Record<string, unknown> = {
      family_id: user.id,
      stakeholder_id: stakeholderId,
      role: providerRole,
      name: provider.name,
      organization: providerOrg,
      email: providerEmail,
      linked_by: user.id,
      status: "pending",
    };

    if (childName) insertPayload.child_name = childName;
    if (childAgentId) insertPayload.child_agent_id = childAgentId;

    let link;
    let linkError;

    const result = await admin
      .from("stakeholder_links")
      .insert(insertPayload)
      .select()
      .single();

    link = result.data;
    linkError = result.error;

    // If insert failed because child columns don't exist yet, retry without them
    if (linkError && (childName || childAgentId)) {
      const fallbackPayload = { ...insertPayload };
      delete fallbackPayload.child_name;
      delete fallbackPayload.child_agent_id;

      const fallbackResult = await admin
        .from("stakeholder_links")
        .insert(fallbackPayload)
        .select()
        .single();

      link = fallbackResult.data;
      linkError = fallbackResult.error;
    }

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    // Send invite email (non-blocking)
    if (providerEmail && link) {
      const inviterName = user.user_metadata?.full_name || user.email || "A family";
      const resolvedChildName = childName || "their child";
      const inviteUrl = `https://mission-control-gray-one.vercel.app/invite/${link.id}`;

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
    });
  } catch (error) {
    console.error("Add to team error:", error);
    return NextResponse.json({ error: "Failed to invite provider to team" }, { status: 500 });
  }
}
