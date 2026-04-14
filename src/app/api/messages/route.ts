import { NextResponse } from "next/server";
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
}

export interface ThreadSummary {
  id: string;
  subject: string;
  messages: MessageRow[];
  lastMessage: MessageRow;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = user.id;
  const admin = createAdminClient();

  // Fetch messages and stakeholder_links in parallel for name enrichment
  const [messagesResult, stakeholdersResult] = await Promise.all([
    admin
      .from("messages")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
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
    threads.push({
      id: threadId,
      subject: lastMessage.thread_subject,
      messages: threadMessages,
      lastMessage,
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
