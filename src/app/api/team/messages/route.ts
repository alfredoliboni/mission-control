import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/team/messages
 * Returns message threads for the stakeholder's linked family,
 * filtered to threads where this stakeholder has participated
 * or all threads for their linked family.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find linked families
  const { data: links } = await admin
    .from("stakeholder_links")
    .select("family_id")
    .eq("stakeholder_id", user.id);

  if (!links || links.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  const familyIds = links.map((l) => l.family_id);

  // Fetch messages for linked families
  const { data: messages, error } = await admin
    .from("messages")
    .select("*")
    .in("family_id", familyIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Team messages fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  // Group by thread
  interface MessageRow {
    id: string;
    family_id: string;
    thread_id: string;
    thread_subject: string;
    sender_id: string;
    sender_role: string;
    content: string;
    created_at: string;
  }

  const threadMap = new Map<string, MessageRow[]>();
  for (const msg of (messages ?? []) as MessageRow[]) {
    const existing = threadMap.get(msg.thread_id) ?? [];
    existing.push(msg);
    threadMap.set(msg.thread_id, existing);
  }

  const threads = [];
  for (const [threadId, threadMessages] of threadMap) {
    const lastMessage = threadMessages[threadMessages.length - 1];
    threads.push({
      id: threadId,
      subject: lastMessage.thread_subject,
      messages: threadMessages,
      lastMessage,
    });
  }

  // Sort by most recent
  threads.sort(
    (a, b) =>
      new Date(b.lastMessage.created_at).getTime() -
      new Date(a.lastMessage.created_at).getTime()
  );

  return NextResponse.json({ threads });
}

/**
 * POST /api/team/messages
 * Send a message as a stakeholder to the linked family.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify stakeholder link
  const { data: links } = await admin
    .from("stakeholder_links")
    .select("family_id, role")
    .eq("stakeholder_id", user.id)
    .limit(1);

  if (!links || links.length === 0) {
    return NextResponse.json(
      { error: "Not a linked stakeholder" },
      { status: 403 }
    );
  }

  const familyId = links[0].family_id;
  const senderRole = links[0].role || "stakeholder";

  const body = await request.json();
  const { thread_id, new_thread_subject, content } = body as {
    thread_id?: string;
    new_thread_subject?: string;
    content: string;
  };

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  let threadId = thread_id;
  let threadSubject = new_thread_subject ?? "New Conversation";

  if (!threadId) {
    threadId = crypto.randomUUID();
  } else {
    // Look up subject from existing thread
    const { data: existingMsg } = await admin
      .from("messages")
      .select("thread_subject")
      .eq("thread_id", threadId)
      .limit(1)
      .single();

    if (existingMsg?.thread_subject) {
      threadSubject = existingMsg.thread_subject;
    }
  }

  const { data: message, error } = await admin
    .from("messages")
    .insert({
      family_id: familyId,
      thread_id: threadId,
      thread_subject: threadSubject,
      sender_id: user.id,
      sender_role: senderRole,
      content: content.trim(),
      attachments: null,
    })
    .select("id, content, created_at")
    .single();

  if (error) {
    console.error("Team message send error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message });
}
