import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * DELETE /api/team/messages/[id]
 * Per-user "Delete for me" for the stakeholder side. Appends the caller's
 * auth user id to `hidden_for_stakeholders` — the family and other stakeholders
 * are unaffected.
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

  const { data: links } = await admin
    .from("family_team_members")
    .select("family_id")
    .eq("stakeholder_user_id", user.id)
    .in("status", ["active", "former"]);

  const familyIds = (links ?? []).map((l) => l.family_id);
  if (familyIds.length === 0) {
    return NextResponse.json({ error: "Not a linked stakeholder" }, { status: 403 });
  }

  if (scope === "thread") {
    const { data: threadMsgs, error: fetchErr } = await admin
      .from("messages")
      .select("id, family_id, sender_id, recipient_id, hidden_for_stakeholders")
      .eq("thread_id", id);

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

    const failures: string[] = [];
    await Promise.all(
      threadMsgs.map(async (m) => {
        const ok = await appendHiddenStakeholder(admin, m.id, user.id, m.hidden_for_stakeholders);
        if (!ok) failures.push(m.id);
      })
    );

    if (failures.length > 0) {
      return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Single message: stakeholder hides it for themselves.
  const { data: msg, error: msgErr } = await admin
    .from("messages")
    .select("id, sender_id, recipient_id, family_id, hidden_for_stakeholders")
    .eq("id", id)
    .single();

  if (msgErr || !msg) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (!familyIds.includes(msg.family_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (msg.sender_id !== user.id && msg.recipient_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await appendHiddenStakeholder(
    admin,
    msg.id,
    user.id,
    msg.hidden_for_stakeholders
  );
  if (!ok) {
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

async function appendHiddenStakeholder(
  admin: AdminClient,
  messageId: string,
  userId: string,
  current: unknown
): Promise<boolean> {
  const list = Array.isArray(current) ? (current as string[]) : [];
  if (list.includes(userId)) return true;
  const next = [...list, userId];
  const { error } = await admin
    .from("messages")
    .update({ hidden_for_stakeholders: next })
    .eq("id", messageId);
  if (error) {
    console.error("Failed to append hidden stakeholder:", error);
    return false;
  }
  return true;
}
