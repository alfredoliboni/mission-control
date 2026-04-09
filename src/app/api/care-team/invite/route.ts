import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  let stakeholderId: string;

  if (existingUser) {
    stakeholderId = existingUser.id;
  } else {
    // Create new account
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "Companion2026!",
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
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
  const existingMetadata = existingUser?.user_metadata || {};
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

  return NextResponse.json({ success: true, stakeholder: link });
}
