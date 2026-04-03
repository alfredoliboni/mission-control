import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const PROVIDER_ROLES = ["provider", "school", "therapist"];

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (!PROVIDER_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Only providers can access this endpoint" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ profile: null }, { status: 404 });
  }

  return NextResponse.json({ profile: data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (!PROVIDER_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Only providers can access this endpoint" },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Strip fields that shouldn't be set by the client
  const {
    id: _id,
    user_id: _uid,
    tier: _tier,
    claimed_at: _ca,
    created_at: _cra,
    ...profileData
  } = body;

  // Check if profile exists
  const { data: existing } = await supabase
    .from("provider_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from("provider_profiles")
      .update({ ...profileData, last_updated: new Date().toISOString() })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ profile: data });
  }

  // Insert new profile
  const { data, error } = await supabase
    .from("provider_profiles")
    .insert({
      ...profileData,
      user_id: user.id,
      tier: "claimed",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data }, { status: 201 });
}
