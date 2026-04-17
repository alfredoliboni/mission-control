import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendInviteEmail } from "@/lib/email";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/care-team/invite
 * Invites a care team member (doctor, therapist, school, specialist).
 * Creates a Supabase auth account + stakeholder_links row.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, name, role, organization, child_name, child_agent_id } = body as {
    email: string;
    name: string;
    role: string;
    organization?: string;
    child_name?: string;
    child_agent_id?: string;
  };

  if (!email || !name || !role) {
    return NextResponse.json({ error: "email, name, and role are required" }, { status: 400 });
  }

  // Use admin client to create user account for the stakeholder
  const supabaseAdmin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Check if a family_team_members row already exists for this name (added by agent, no email yet)
  const { data: existingTeamMember } = await supabaseAdmin
    .from("family_team_members")
    .select("id")
    .eq("family_id", user.id)
    .eq("name", name)
    .limit(1)
    .single();

  if (existingTeamMember) {
    // Update the existing row with the provided email — don't create a duplicate
    await supabaseAdmin
      .from("family_team_members")
      .update({ email })
      .eq("id", existingTeamMember.id);
  }

  // Try to create the user — if they already exist, fetch their ID
  let stakeholderId: string;

  // Create user WITHOUT a password — they'll set one when they accept the invite.
  // Supabase generates an unusable random password internally.
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { needs_password_setup: true },
  });

  if (createError) {
    if (createError.message?.includes("already been registered")) {
      // User exists — find their ID by email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const existingUser = existingUsers?.users?.find(u => u.email === email);
      if (!existingUser) {
        return NextResponse.json({ error: "Could not find existing user" }, { status: 500 });
      }
      stakeholderId = existingUser.id;
    } else {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
  } else {
    stakeholderId = newUser.user.id;
  }

  // Check for duplicate invite (per family + stakeholder + child)
  let duplicateQuery = supabaseAdmin
    .from("stakeholder_links")
    .select("id")
    .eq("family_id", user.id)
    .eq("stakeholder_id", stakeholderId);

  if (child_name) {
    duplicateQuery = duplicateQuery.eq("child_name", child_name);
  } else {
    duplicateQuery = duplicateQuery.is("child_name", null);
  }

  const { data: existingLink } = await duplicateQuery.limit(1);

  if (existingLink && existingLink.length > 0) {
    const forChild = child_name ? ` for ${child_name}` : "";
    return NextResponse.json({ error: `This person has already been invited to your care team${forChild}` }, { status: 400 });
  }

  // Merge metadata (preserve existing role like "provider" if they registered)
  const { data: stakeholderUser } = await supabaseAdmin.auth.admin.getUserById(stakeholderId);
  const existingMetadata = stakeholderUser?.user?.user_metadata || {};
  await supabaseAdmin.auth.admin.updateUserById(stakeholderId, {
    user_metadata: { ...existingMetadata, stakeholder_role: role, is_stakeholder: true },
  });

  // Insert stakeholder link (include child fields if provided — columns may not exist yet)
  const insertPayload: Record<string, unknown> = {
    family_id: user.id,
    stakeholder_id: stakeholderId,
    role,
    name,
    organization: organization || null,
    linked_by: user.id,
    status: "pending",
  };

  if (child_name) insertPayload.child_name = child_name;
  if (child_agent_id) insertPayload.child_agent_id = child_agent_id;

  let link;
  let linkError;

  const result = await supabaseAdmin
    .from("stakeholder_links")
    .insert(insertPayload)
    .select()
    .single();

  link = result.data;
  linkError = result.error;

  // If the insert failed because child columns don't exist yet, retry without them
  if (linkError && (child_name || child_agent_id)) {
    const fallbackPayload = { ...insertPayload };
    delete fallbackPayload.child_name;
    delete fallbackPayload.child_agent_id;

    const fallbackResult = await supabaseAdmin
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

  // Send invite email (non-blocking — failure doesn't break the invite)
  const inviterName = user.user_metadata?.full_name || user.email || "A family";
  const resolvedChildName = child_name || "their child";
  const inviteUrl = `https://mission-control-gray-one.vercel.app/invite/${link.id}`;

  sendInviteEmail({
    to: email,
    inviterName,
    childName: resolvedChildName,
    role,
    inviteUrl,
  }).catch((err) => console.error("[invite] Email send error:", err));

  return NextResponse.json({ success: true, stakeholder: link });
}
