import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/portal/university
 * Registers a university for neurodiverse student matching.
 * Creates a Supabase auth account + inserts into providers table as type "university".
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    institutionName,
    contactEmail,
    contactPhone,
    website,
    department,
    programs,
    accommodations,
    accessibilityOfficeContact,
    applicationAccommodations,
    transitionSupport,
    description,
    address,
    postalCode,
  } = body;

  if (!institutionName || !contactEmail) {
    return NextResponse.json({ error: "Institution name and email required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create auth account for the university
  let authUserId: string | null = null;
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === contactEmail);

  if (existing) {
    authUserId = existing.id;
  } else {
    const { data: newUser, error: authError } = await admin.auth.admin.createUser({
      email: contactEmail,
      password: "Companion2026!",
      email_confirm: true,
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
    authUserId = newUser.user.id;
  }

  // Auto-prepend https:// to website if missing
  let normalizedWebsite = website || null;
  if (normalizedWebsite && !normalizedWebsite.match(/^https?:\/\//)) {
    normalizedWebsite = `https://${normalizedWebsite}`;
  }

  // Insert into providers table as type "university"
  const city = address?.split(",").pop()?.trim() || "";
  const { data: provider, error: insertError } = await admin
    .from("providers")
    .insert({
      name: institutionName,
      type: "university",
      description: description || null,
      specialties: accommodations || [],
      services: programs || [],
      location_city: city,
      location_postal: postalCode || null,
      location_address: address || null,
      phone: contactPhone || null,
      email: contactEmail,
      website: normalizedWebsite,
      is_verified: false,
      metadata: {
        department,
        accessibilityOfficeContact,
        applicationAccommodations,
        transitionSupport,
        authUserId,
      },
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: provider.id, authUserId });
}
