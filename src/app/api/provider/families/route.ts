import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const PROVIDER_ROLES = ["provider", "school", "therapist"];

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;
  if (!PROVIDER_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("stakeholder_links")
    .select("*")
    .eq("stakeholder_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ families: data ?? [] });
}
