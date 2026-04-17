import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE /api/messages/[id] — soft delete (sets deleted_at = NOW())
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", user.id);

  if (error) {
    console.error("Error soft-deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/messages/[id] — restore from trash (sets deleted_at = NULL)
// Body: { action: "restore" }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { action?: string };

  if (body.action !== "restore") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("messages")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("family_id", user.id);

  if (error) {
    console.error("Error restoring message:", error);
    return NextResponse.json(
      { error: "Failed to restore message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
