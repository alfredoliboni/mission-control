import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  // Only the family owner can remove a link
  const { data: link } = await supabase
    .from("stakeholder_links")
    .select("family_id")
    .eq("id", id)
    .single();

  if (!link || link.family_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("stakeholder_links")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
