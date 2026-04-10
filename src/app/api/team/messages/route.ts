import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/team/messages
 * Returns message threads for the stakeholder's linked family,
 * filtered to threads where this stakeholder has participated
 * or all threads for their linked family.
 * Accepts optional ?family_id= to filter by a specific family.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find linked families (accepted only)
  const { data: links } = await admin
    .from("stakeholder_links")
    .select("family_id")
    .eq("stakeholder_id", user.id)
    .or("status.eq.accepted,status.is.null");

  if (!links || links.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  // If family_id is specified, filter to that family (must be in linked set)
  const requestedFamilyId = request.nextUrl.searchParams.get("family_id");
  let familyIds = links.map((l) => l.family_id);

  if (requestedFamilyId) {
    if (!familyIds.includes(requestedFamilyId)) {
      return NextResponse.json({ error: "Unauthorized family access" }, { status: 403 });
    }
    familyIds = [requestedFamilyId];
  }

  // Fetch messages and stakeholder names in parallel
  const [messagesResult, stakeholdersResult] = await Promise.all([
    admin
      .from("messages")
      .select("*")
      .in("family_id", familyIds)
      .order("created_at", { ascending: true }),
    admin
      .from("stakeholder_links")
      .select("stakeholder_id, family_id, name, role, organization")
      .in("family_id", familyIds),
  ]);

  if (messagesResult.error) {
    console.error("Team messages fetch error:", messagesResult.error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  const messages = messagesResult.data;

  // Build name lookup maps
  const stakeholderNameMap = new Map<string, string>();
  for (const s of stakeholdersResult.data ?? []) {
    stakeholderNameMap.set(s.stakeholder_id, s.name);
  }

  // Group by thread
  interface MessageRow {
    id: string;
    family_id: string;
    thread_id: string;
    thread_subject: string;
    sender_id: string;
    sender_role: string;
    sender_name?: string;
    recipient_id?: string;
    recipient_name?: string;
    content: string;
    created_at: string;
  }

  const threadMap = new Map<string, MessageRow[]>();
  for (const msg of (messages ?? []) as MessageRow[]) {
    // Enrich sender_name if not stored
    if (!msg.sender_name) {
      if (msg.sender_role === "parent") {
        msg.sender_name = "Family";
      } else {
        msg.sender_name = stakeholderNameMap.get(msg.sender_id) ?? undefined;
      }
    }
    const existing = threadMap.get(msg.thread_id) ?? [];
    existing.push(msg);
    threadMap.set(msg.thread_id, existing);
  }

  // Filter: only show threads where THIS stakeholder sent or received a message
  const threads = [];
  for (const [threadId, threadMessages] of threadMap) {
    const stakeholderInThread = threadMessages.some(
      (m) => m.sender_id === user.id || m.recipient_id === user.id
    );
    if (!stakeholderInThread) continue;

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

  // Verify stakeholder link (accepted only)
  const { data: links } = await admin
    .from("stakeholder_links")
    .select("family_id, role, name")
    .eq("stakeholder_id", user.id)
    .or("status.eq.accepted,status.is.null");

  if (!links || links.length === 0) {
    return NextResponse.json(
      { error: "Not a linked stakeholder" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { thread_id, new_thread_subject, content, recipient_id, recipient_name, family_id: requestedFamilyId } = body as {
    thread_id?: string;
    new_thread_subject?: string;
    content: string;
    recipient_id?: string;
    recipient_name?: string;
    family_id?: string;
  };

  // Resolve which family to send the message to
  const linkedFamilyIds = links.map((l) => l.family_id);
  let familyId: string;
  let senderRole: string;

  if (requestedFamilyId && linkedFamilyIds.includes(requestedFamilyId)) {
    familyId = requestedFamilyId;
    senderRole = links.find((l) => l.family_id === requestedFamilyId)?.role || "stakeholder";
  } else {
    familyId = links[0].family_id;
    senderRole = links[0].role || "stakeholder";
  }

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

  // Look up the stakeholder's name from the link matching the active family
  const activeLink = links.find((l) => l.family_id === familyId) || links[0];
  const senderName = activeLink.name || senderRole;

  const { data: message, error } = await admin
    .from("messages")
    .insert({
      family_id: familyId,
      thread_id: threadId,
      thread_subject: threadSubject,
      sender_id: user.id,
      sender_role: senderRole,
      sender_name: senderName,
      recipient_id: recipient_id || null,
      recipient_name: recipient_name || null,
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
