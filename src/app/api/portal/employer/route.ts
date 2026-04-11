import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/portal/employer
 * Registers an employer for supported employment matching.
 * Creates a Supabase auth account + inserts into providers table as type "employer".
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    companyName,
    industry,
    contactEmail,
    contactPhone,
    website,
    address,
    city,
    postalCode,
    positionTypes,
    accommodations,
    description,
  } = body;

  if (!companyName || !contactEmail) {
    return NextResponse.json({ error: "Company name and email required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create auth account for the employer (try create first, handle existing)
  let authUserId: string | null = null;
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email: contactEmail,
    password: "Companion2026!",
    email_confirm: true,
  });
  if (authError) {
    if (authError.message?.includes("already been registered")) {
      const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
      authUserId = existing?.users?.find((u) => u.email === contactEmail)?.id || null;
    } else {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
  } else {
    authUserId = newUser.user.id;
  }

  // Insert into providers table as type "employer"
  const locationCity = city?.trim() || null;
  const { data: provider, error: insertError } = await admin
    .from("providers")
    .insert({
      name: companyName,
      type: "employer",
      description: description || null,
      specialties: accommodations || [],
      services: positionTypes || [],
      location_city: locationCity,
      location_postal: postalCode || null,
      location_address: address || null,
      phone: contactPhone || null,
      email: contactEmail,
      website: website || null,
      is_verified: false,
      metadata: { industry, authUserId },
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: provider.id, authUserId });
}
