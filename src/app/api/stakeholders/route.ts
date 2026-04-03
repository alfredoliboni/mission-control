import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;

  if (role === "parent") {
    // Parents see stakeholders linked to them
    const { data, error } = await supabase
      .from("stakeholder_links")
      .select("*")
      .eq("family_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ stakeholders: data });
  }

  // Stakeholders see families they're linked to
  const { data, error } = await supabase
    .from("stakeholder_links")
    .select("*")
    .eq("stakeholder_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ stakeholders: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (role !== "parent" && role !== "admin") {
    return NextResponse.json(
      { error: "Only parents can invite stakeholders" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { email, stakeholder_role } = body as {
    email?: string;
    stakeholder_role?: string;
  };

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if already linked
  const { data: existing } = await supabase
    .from("stakeholder_links")
    .select("id")
    .eq("family_id", user.id)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This stakeholder is already linked" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("stakeholder_links")
    .insert({
      family_id: user.id,
      email,
      role: stakeholder_role ?? "provider",
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stakeholder: data }, { status: 201 });
}
