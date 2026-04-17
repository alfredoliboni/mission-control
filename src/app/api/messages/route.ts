import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MessageRow {
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
  attachments: unknown[] | null;
  created_at: string;
  child_agent_id?: string;
  deleted_at?: string | null;
  read_at?: string | null;
}

export interface ThreadSummary {
  id: string;
  subject: string;
  messages: MessageRow[];
  lastMessage: MessageRow;
  unreadCount: number;
  recipientName?: string;
  childAgentId?: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = user.id;
  const admin = createAdminClient();

  const { searchParams } = new URL(request.url);
  const agentFilter = searchParams.get("agent");
  const trashMode = searchParams.get("trash") === "true";

  // Build the messages query
  let messagesQuery = admin
    .from("messages")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  // Soft-delete filtering
  if (trashMode) {
    messagesQuery = messagesQuery.not("deleted_at", "is", null);
  } else {
    messagesQuery = messagesQuery.is("deleted_at", null);
  }

  // Per-child filtering: match rows tagged for this child OR untagged (NULL).
  // Untagged rows are treated as family-wide (legacy or broadcast) and visible
  // regardless of which child is selected.
  if (agentFilter) {
    messagesQuery = messagesQuery.or(
      `child_agent_id.eq.${agentFilter},child_agent_id.is.null`
    );
  }

  // Fetch messages and stakeholder_links in parallel for name enrichment
  const [messagesResult, stakeholdersResult] = await Promise.all([
    messagesQuery,
    admin
      .from("stakeholder_links")
      .select("stakeholder_id, name, role, organization")
      .eq("family_id", familyId),
  ]);

  if (messagesResult.error) {
    console.error("Error fetching messages:", messagesResult.error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  const messages = messagesResult.data;

  // Build a lookup map: stakeholder_id -> name
  const nameMap = new Map<string, string>();
  for (const s of stakeholdersResult.data ?? []) {
    nameMap.set(s.stakeholder_id, s.name);
  }

  // Group messages by thread_id, enriching sender_name if missing
  const threadMap = new Map<string, MessageRow[]>();
  for (const msg of (messages ?? []) as MessageRow[]) {
    // Enrich sender_name from stakeholder_links if not stored on the message
    if (!msg.sender_name) {
      if (msg.sender_id === familyId) {
        msg.sender_name = "You";
      } else {
        msg.sender_name = nameMap.get(msg.sender_id) ?? undefined;
      }
    }
    const existing = threadMap.get(msg.thread_id) ?? [];
    existing.push(msg);
    threadMap.set(msg.thread_id, existing);
  }

  const threads: ThreadSummary[] = [];
  for (const [threadId, threadMessages] of threadMap) {
    const lastMessage = threadMessages[threadMessages.length - 1];

    // Count unread: incoming messages (not from parent) where read_at is null
    const unreadCount = threadMessages.filter(
      (m) => m.sender_role !== "parent" && m.read_at == null
    ).length;

    // Derive recipient name and child agent id from the thread messages
    const recipientMsg = threadMessages.find((m) => m.recipient_name);
    const childAgentMsg = threadMessages.find((m) => m.child_agent_id);

    threads.push({
      id: threadId,
      subject: lastMessage.thread_subject,
      messages: threadMessages,
      lastMessage,
      unreadCount,
      recipientName: recipientMsg?.recipient_name ?? undefined,
      childAgentId: childAgentMsg?.child_agent_id ?? undefined,
    });
  }

  // Sort threads by most recent message first
  threads.sort(
    (a, b) =>
      new Date(b.lastMessage.created_at).getTime() -
      new Date(a.lastMessage.created_at).getTime()
  );

  return NextResponse.json({ threads });
}
