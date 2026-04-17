import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/messages/read
// Body: { thread_id }
// Marks all unread incoming messages in the thread as read
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { thread_id?: string };

  if (!body.thread_id) {
    return NextResponse.json({ error: "thread_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", body.thread_id)
    .eq("family_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
