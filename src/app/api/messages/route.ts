import { cookies } from "next/headers";
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

// Demo threads for demo mode — using real contact names
const DEMO_THREADS: ThreadSummary[] = [
  {
    id: "demo-thread-1",
    subject: "IEP Discussion",
    lastMessage: {
      id: "demo-msg-3",
      family_id: "demo",
      thread_id: "demo-thread-1",
      thread_subject: "IEP Discussion",
      sender_id: "ms-rodriguez",
      sender_role: "school",
      sender_name: "Ms. Thompson",
      content:
        "I'll check with the principal about increasing EA hours. Could you review the IEP draft and share feedback by April 5?",
      attachments: null,
      created_at: "2026-03-28T14:30:00Z",
    },
    messages: [
      {
        id: "demo-msg-1",
        family_id: "demo",
        thread_id: "demo-thread-1",
        thread_subject: "IEP Discussion",
        sender_id: "demo-parent",
        sender_role: "parent",
        sender_name: "Santos Family",
        recipient_id: "ms-rodriguez",
        recipient_name: "Ms. Thompson",
        content:
          "Hi Ms. Thompson, I wanted to discuss Alex's social goals for the updated IEP. We've noticed improvements at home with turn-taking during board games.",
        attachments: null,
        created_at: "2026-03-25T10:00:00Z",
      },
      {
        id: "demo-msg-2",
        family_id: "demo",
        thread_id: "demo-thread-1",
        thread_subject: "IEP Discussion",
        sender_id: "ms-rodriguez",
        sender_role: "school",
        sender_name: "Ms. Thompson",
        content:
          "That's great to hear! I've updated the draft to reflect those improvements. I've also added a goal around peer interactions during group work. Here's the updated IEP draft.",
        attachments: [{ name: "IEP_Draft_v2.pdf", type: "application/pdf" }],
        created_at: "2026-03-27T09:15:00Z",
      },
      {
        id: "demo-msg-3",
        family_id: "demo",
        thread_id: "demo-thread-1",
        thread_subject: "IEP Discussion",
        sender_id: "ms-rodriguez",
        sender_role: "school",
        sender_name: "Ms. Thompson",
        content:
          "I'll check with the principal about increasing EA hours. Could you review the IEP draft and share feedback by April 5?",
        attachments: null,
        created_at: "2026-03-28T14:30:00Z",
      },
    ],
  },
  {
    id: "demo-thread-2",
    subject: "Medication Follow-up",
    lastMessage: {
      id: "demo-msg-6",
      family_id: "demo",
      thread_id: "demo-thread-2",
      thread_subject: "Medication Follow-up",
      sender_id: "dr-patel",
      sender_role: "doctor",
      sender_name: "Dr. Park",
      content:
        "Appointment confirmed for April 15 at 2:00 PM. Please keep tracking the sleep log — bring 2 weeks of data to the appointment so we can assess melatonin effectiveness.",
      attachments: null,
      created_at: "2026-03-20T11:45:00Z",
    },
    messages: [
      {
        id: "demo-msg-4",
        family_id: "demo",
        thread_id: "demo-thread-2",
        thread_subject: "Medication Follow-up",
        sender_id: "demo-parent",
        sender_role: "parent",
        sender_name: "Santos Family",
        recipient_id: "dr-patel",
        recipient_name: "Dr. Park",
        content:
          "Dr. Park, Alex has been on melatonin for 3 weeks now. Sleep has improved somewhat but he still wakes up around 3 AM most nights. Should we adjust the dose?",
        attachments: null,
        created_at: "2026-03-18T20:00:00Z",
      },
      {
        id: "demo-msg-5",
        family_id: "demo",
        thread_id: "demo-thread-2",
        thread_subject: "Medication Follow-up",
        sender_id: "dr-patel",
        sender_role: "doctor",
        sender_name: "Dr. Park",
        content:
          "Thank you for the update. Let's not adjust yet — 3 weeks isn't enough to see the full effect. Can we book a follow-up in a few weeks to review?",
        attachments: null,
        created_at: "2026-03-19T09:30:00Z",
      },
      {
        id: "demo-msg-6",
        family_id: "demo",
        thread_id: "demo-thread-2",
        thread_subject: "Medication Follow-up",
        sender_id: "dr-patel",
        sender_role: "doctor",
        sender_name: "Dr. Park",
        content:
          "Appointment confirmed for April 15 at 2:00 PM. Please keep tracking the sleep log — bring 2 weeks of data to the appointment so we can assess melatonin effectiveness.",
        attachments: null,
        created_at: "2026-03-20T11:45:00Z",
      },
    ],
  },
  {
    id: "demo-thread-3",
    subject: "OT Waitlist Update",
    lastMessage: {
      id: "demo-msg-8",
      family_id: "demo",
      thread_id: "demo-thread-3",
      thread_subject: "OT Waitlist Update",
      sender_id: "sarah-ot",
      sender_role: "therapist",
      sender_name: "Sarah Williams",
      content:
        "Good news — a spot may open up in June. I'll keep you at the top of the list. In the meantime, the sensory strategies I shared should help with the classroom fidgeting.",
      attachments: null,
      created_at: "2026-03-22T16:00:00Z",
    },
    messages: [
      {
        id: "demo-msg-7",
        family_id: "demo",
        thread_id: "demo-thread-3",
        thread_subject: "OT Waitlist Update",
        sender_id: "demo-parent",
        sender_role: "parent",
        sender_name: "Santos Family",
        recipient_id: "sarah-ot",
        recipient_name: "Sarah Williams",
        content:
          "Hi Sarah, just checking in on the OT waitlist. Alex's teacher mentioned he's struggling more with sensory regulation in the classroom lately.",
        attachments: null,
        created_at: "2026-03-22T10:00:00Z",
      },
      {
        id: "demo-msg-8",
        family_id: "demo",
        thread_id: "demo-thread-3",
        thread_subject: "OT Waitlist Update",
        sender_id: "sarah-ot",
        sender_role: "therapist",
        sender_name: "Sarah Williams",
        content:
          "Good news — a spot may open up in June. I'll keep you at the top of the list. In the meantime, the sensory strategies I shared should help with the classroom fidgeting.",
        attachments: null,
        created_at: "2026-03-22T16:00:00Z",
      },
    ],
  },
];

export async function GET() {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("companion-demo")?.value === "true";

  // Demo mode: return static threads
  if (isDemo) {
    return NextResponse.json({ threads: DEMO_THREADS });
  }

  // Authenticated mode: query Supabase
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
