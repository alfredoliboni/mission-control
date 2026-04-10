import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProviderWelcomeEmail } from "@/lib/email";

interface RegistrationPayload {
  organizationName: string;
  contactEmail: string;
  password: string;
  phone?: string;
  type?: string;
  services?: string[];
  specialties?: string;
  agesServed?: string;
  locationAddress?: string;
  city?: string;
  postalCode?: string;
  fundingAccepted?: string[];
  waitTimeEstimate?: string;
  website?: string;
  description?: string;
}

/**
 * POST /api/portal/register
 * Public endpoint — providers self-register.
 * Creates a Supabase auth account and inserts into the providers table.
 */
export async function POST(request: NextRequest) {
  let body: RegistrationPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { organizationName, contactEmail, password } = body;

  if (!organizationName?.trim() || !contactEmail?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: "Organization name, email, and password are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1. Create a Supabase auth account for the provider
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: contactEmail.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        role: "provider",
        organization_name: organizationName.trim(),
      },
    });

  if (authError) {
    // If user already exists, continue — they may be re-registering
    if (!authError.message?.includes("already been registered")) {
      console.error("Auth creation error:", authError);
      return NextResponse.json(
        { error: "Failed to create account: " + authError.message },
        { status: 400 }
      );
    }
  }

  // 2. Parse specialties from comma-separated string to array
  const specialtiesArray = body.specialties
    ? body.specialties
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];

  // 3. Build the description, appending ages served if provided
  let fullDescription = body.description?.trim() || "";
  if (body.agesServed) {
    fullDescription = fullDescription
      ? `${fullDescription}\n\nAges served: ${body.agesServed}`
      : `Ages served: ${body.agesServed}`;
  }

  // 4. City: use explicit field, fall back to parsing from address
  let locationCity: string | null = body.city?.trim() || null;
  if (!locationCity && body.locationAddress) {
    const parts = body.locationAddress.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      locationCity = parts[1];
    }
  }

  // 5. Map funding labels to database values
  const fundingMap: Record<string, string> = {
    OAP: "oap",
    Private: "private",
    Insurance: "insurance",
    ODSP: "odsp",
  };
  const acceptsFunding = (body.fundingAccepted || []).map(
    (f) => fundingMap[f] || f.toLowerCase()
  );

  // 6. Insert into providers table
  const { data: provider, error: insertError } = await supabase
    .from("providers")
    .insert({
      name: organizationName.trim(),
      email: contactEmail.trim(),
      phone: body.phone?.trim() || null,
      type: body.type || null,
      services: body.services || [],
      specialties: specialtiesArray,
      description: fullDescription || null,
      location_address: body.locationAddress?.trim() || null,
      location_city: locationCity,
      location_postal: body.postalCode?.trim() || null,
      website: body.website?.trim()
        ? (body.website.trim().startsWith("http") ? body.website.trim() : `https://${body.website.trim()}`)
        : null,
      accepts_funding: acceptsFunding,
      waitlist_estimate: body.waitTimeEstimate || null,
      is_verified: false,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Provider insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to create provider profile" },
      { status: 500 }
    );
  }

  // Send welcome email (non-blocking)
  sendProviderWelcomeEmail({
    to: contactEmail.trim(),
    organizationName: organizationName.trim(),
  });

  return NextResponse.json({
    success: true,
    id: provider.id,
    authUserId: authData?.user?.id ?? null,
  });
}
