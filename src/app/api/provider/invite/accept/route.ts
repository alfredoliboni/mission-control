import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const PROVIDER_ROLES = ["provider", "school", "therapist"];

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (!PROVIDER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { link_id } = body as { link_id?: string };

  if (!link_id) {
    return NextResponse.json({ error: "link_id is required" }, { status: 400 });
  }

  // Find the pending link for this user's email
  const { data: link, error: findError } = await supabase
    .from("stakeholder_links")
    .select("*")
    .eq("id", link_id)
    .eq("email", user.email)
    .eq("status", "pending")
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!link) {
    return NextResponse.json(
      { error: "Invitation not found or already accepted" },
      { status: 404 }
    );
  }

  // Accept the invite: set stakeholder_id and status
  const { data, error } = await supabase
    .from("stakeholder_links")
    .update({
      stakeholder_id: user.id,
      status: "active",
      name: user.user_metadata?.full_name ?? null,
    })
    .eq("id", link_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ link: data });
}
