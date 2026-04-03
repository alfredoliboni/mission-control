import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

const PROVIDER_ROLES = ["provider", "school", "therapist"];

async function getProviderProfileId(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("provider_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (!PROVIDER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const providerId = await getProviderProfileId(supabase, user.id);
  if (!providerId) {
    return NextResponse.json({ programs: [] });
  }

  const { data, error } = await supabase
    .from("provider_programs")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ programs: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (!PROVIDER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const providerId = await getProviderProfileId(supabase, user.id);
  if (!providerId) {
    return NextResponse.json(
      { error: "Create a provider profile first" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { title, description, type, is_gap_filler, ages, cost, funding_eligible } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("provider_programs")
    .insert({
      provider_id: providerId,
      title,
      description: description ?? null,
      type: type ?? null,
      is_gap_filler: is_gap_filler ?? false,
      ages: ages ?? null,
      cost: cost ?? null,
      funding_eligible: funding_eligible ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ program: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (!PROVIDER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const providerId = await getProviderProfileId(supabase, user.id);
  if (!providerId) {
    return NextResponse.json({ error: "No provider profile" }, { status: 400 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Program id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("provider_programs")
    .update(updates)
    .eq("id", id)
    .eq("provider_id", providerId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ program: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (!PROVIDER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const providerId = await getProviderProfileId(supabase, user.id);
  if (!providerId) {
    return NextResponse.json({ error: "No provider profile" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Program id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("provider_programs")
    .delete()
    .eq("id", id)
    .eq("provider_id", providerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
