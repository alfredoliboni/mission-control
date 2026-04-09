import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/portal/profile
 * Returns the provider profile for the authenticated user.
 * Matches by auth user email against providers.email.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Find provider by email
    const { data: provider, error: queryError } = await admin
      .from("providers")
      .select("*")
      .eq("email", user.email)
      .single();

    if (queryError || !provider) {
      return NextResponse.json(
        { error: "Provider profile not found" },
        { status: 404 }
      );
    }

    // Fetch programs linked to this provider
    const { data: programs } = await admin
      .from("programs")
      .select("id, name, description, type, status")
      .eq("provider_id", provider.id)
      .order("name", { ascending: true });

    return NextResponse.json({
      provider,
      programs: programs ?? [],
    });
  } catch (err) {
    console.error("Portal profile GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/portal/profile
 * Update provider profile fields.
 * Only allows updating specific safe fields.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify provider exists
    const { data: provider, error: findError } = await admin
      .from("providers")
      .select("id")
      .eq("email", user.email)
      .single();

    if (findError || !provider) {
      return NextResponse.json(
        { error: "Provider profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Whitelist of updatable fields
    const ALLOWED_FIELDS = [
      "phone",
      "services",
      "specialties",
      "description",
      "website",
      "waitlist_estimate",
      "location_address",
      "location_city",
      "location_postal",
      "accepts_funding",
    ] as const;

    type AllowedField = (typeof ALLOWED_FIELDS)[number];

    const updates: Partial<Record<AllowedField, unknown>> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await admin
      .from("providers")
      .update(updates)
      .eq("id", provider.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Provider update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update provider profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ provider: updated });
  } catch (err) {
    console.error("Portal profile PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
