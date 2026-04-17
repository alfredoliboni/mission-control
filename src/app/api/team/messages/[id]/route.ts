import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/team/messages/[id]
 * Soft-delete messages from the stakeholder (doctor/therapist/school) side.
 *
 * Modes:
 * - ?scope=thread → delete every message in the thread (id = thread_id).
 *                   Allowed if the stakeholder participated (sender or recipient)
 *                   in at least one message of the thread AND the thread belongs
 *                   to one of their linked families.
 * - default       → delete a single message (id = message id).
 *                   Allowed only if the stakeholder is the message's sender.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const scope = request.nextUrl.searchParams.get("scope");
  const admin = createAdminClient();

  // Resolve which families this stakeholder is linked to
  const { data: links } = await admin
    .from("stakeholder_links")
    .select("family_id")
    .eq("stakeholder_id", user.id)
    .or("status.eq.accepted,status.is.null");

  const familyIds = (links ?? []).map((l) => l.family_id);
  if (familyIds.length === 0) {
    return NextResponse.json({ error: "Not a linked stakeholder" }, { status: 403 });
  }

  if (scope === "thread") {
    // Verify stakeholder participated in this thread, and thread is within their families
    const { data: threadMsgs, error: fetchErr } = await admin
      .from("messages")
      .select("id, family_id, sender_id, recipient_id")
      .eq("thread_id", id)
      .is("deleted_at", null);

    if (fetchErr) {
      return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
    }
    if (!threadMsgs || threadMsgs.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const threadFamilyId = threadMsgs[0].family_id;
    if (!familyIds.includes(threadFamilyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const participated = threadMsgs.some(
      (m) => m.sender_id === user.id || m.recipient_id === user.id
    );
    if (!participated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: updErr } = await admin
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("thread_id", id);

    if (updErr) {
      return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Single message: stakeholder must be the sender
  const { data: msg, error: msgErr } = await admin
    .from("messages")
    .select("id, sender_id, family_id")
    .eq("id", id)
    .single();

  if (msgErr || !msg) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (msg.sender_id !== user.id) {
    return NextResponse.json(
      { error: "You can only delete messages you sent" },
      { status: 403 }
    );
  }
  if (!familyIds.includes(msg.family_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: delErr } = await admin
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (delErr) {
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
