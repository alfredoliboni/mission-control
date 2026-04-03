import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

// GET /api/messages — list threads for the current user
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const role = user.user_metadata?.role;

  let familyIds: string[] = [];

  if (role === "parent") {
    // Parents see their own family threads
    familyIds = [user.id];
  } else {
    // Stakeholders see threads for families they are linked to
    const { data: links, error: linkError } = await supabase
      .from("stakeholder_links")
      .select("family_id")
      .eq("stakeholder_id", user.id)
      .eq("status", "active");

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
    familyIds = (links ?? []).map((l) => l.family_id);
  }

  if (familyIds.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  // Fetch all messages for these families, ordered by created_at desc
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .in("family_id", familyIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by thread_id and build thread summaries
  const threadMap = new Map<
    string,
    {
      thread_id: string;
      thread_subject: string;
      family_id: string;
      last_message: string;
      last_message_at: string;
      last_sender_role: string;
      message_count: number;
    }
  >();

  for (const msg of messages ?? []) {
    const tid = msg.thread_id;
    if (!tid) continue;

    const existing = threadMap.get(tid);
    if (!existing) {
      threadMap.set(tid, {
        thread_id: tid,
        thread_subject: msg.thread_subject ?? "No subject",
        family_id: msg.family_id,
        last_message: msg.content,
        last_message_at: msg.created_at,
        last_sender_role: msg.sender_role,
        message_count: 1,
      });
    } else {
      existing.message_count += 1;
      // messages are ordered desc, so the first one per thread is the latest
    }
  }

  const threads = Array.from(threadMap.values()).sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
  );

  return NextResponse.json({ threads });
}

// POST /api/messages — create a new message (optionally creates a new thread)
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const { thread_id, thread_subject, family_id, content } = body as {
    thread_id?: string;
    thread_subject?: string;
    family_id?: string;
    content?: string;
  };

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const role = user.user_metadata?.role ?? "parent";

  // For new threads, generate a thread_id
  const resolvedThreadId =
    thread_id ?? crypto.randomUUID();
  const resolvedFamilyId =
    family_id ?? (role === "parent" ? user.id : undefined);

  if (!resolvedFamilyId) {
    return NextResponse.json(
      { error: "family_id is required for stakeholders" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      thread_id: resolvedThreadId,
      thread_subject: thread_subject ?? null,
      family_id: resolvedFamilyId,
      sender_id: user.id,
      sender_role: role,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data }, { status: 201 });
}
