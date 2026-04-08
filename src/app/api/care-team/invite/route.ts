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
  const { email, name, role, organization } = body as {
    email: string;
    name: string;
    role: string;
    organization?: string;
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

  // Set user_metadata so the account is identifiable as a stakeholder
  await supabaseAdmin.auth.admin.updateUserById(stakeholderId, {
    user_metadata: { role: "stakeholder", stakeholder_role: role },
  });

  // Insert stakeholder link
  const { data: link, error: linkError } = await supabaseAdmin
    .from("stakeholder_links")
    .insert({
      family_id: user.id,
      stakeholder_id: stakeholderId,
      role,
      name,
      organization: organization || null,
      linked_by: user.id,
    })
    .select()
    .single();

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, stakeholder: link });
}
