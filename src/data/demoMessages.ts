export interface DemoMessage {
  id: string;
  thread_id: string;
  thread_subject: string;
  family_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
}

export interface DemoThread {
  thread_id: string;
  thread_subject: string;
  family_id: string;
  last_message: string;
  last_message_at: string;
  last_sender_name: string;
  last_sender_role: string;
  message_count: number;
  participants: { name: string; role: string }[];
}

const PARENT_ID = "demo-parent";
const DR_PATEL_ID = "demo-dr-patel";
const MS_RODRIGUEZ_ID = "demo-ms-rodriguez";
const SARAH_ID = "demo-sarah-therapist";
const FAMILY_ID = "demo-family";

export const demoMessages: DemoMessage[] = [
  // Thread 1: Medication Update (3 messages)
  {
    id: "msg-1a",
    thread_id: "thread-1",
    thread_subject: "Alex — Medication Update",
    family_id: FAMILY_ID,
    sender_id: DR_PATEL_ID,
    sender_name: "Dr. Patel",
    sender_role: "provider",
    content:
      "Hi! Just wanted to follow up on Alex's medication adjustment from last week. Have you noticed any changes in appetite or sleep patterns?",
    created_at: "2026-03-30T10:15:00Z",
  },
  {
    id: "msg-1b",
    thread_id: "thread-1",
    thread_subject: "Alex — Medication Update",
    family_id: FAMILY_ID,
    sender_id: PARENT_ID,
    sender_name: "You",
    sender_role: "parent",
    content:
      "Thanks for checking in, Dr. Patel. His appetite has been a bit lower in the mornings, but sleep has actually improved — he's falling asleep about 30 minutes earlier than before.",
    created_at: "2026-03-30T14:22:00Z",
  },
  {
    id: "msg-1c",
    thread_id: "thread-1",
    thread_subject: "Alex — Medication Update",
    family_id: FAMILY_ID,
    sender_id: DR_PATEL_ID,
    sender_name: "Dr. Patel",
    sender_role: "provider",
    content:
      "That's great to hear about the sleep improvement. The reduced morning appetite is common in the first two weeks and usually normalises. Let's monitor for another week and I'll check in again. If anything concerns you before then, don't hesitate to message me.",
    created_at: "2026-03-30T15:45:00Z",
  },

  // Thread 2: IEP Review Meeting (2 messages)
  {
    id: "msg-2a",
    thread_id: "thread-2",
    thread_subject: "IEP Review Meeting",
    family_id: FAMILY_ID,
    sender_id: MS_RODRIGUEZ_ID,
    sender_name: "Ms. Rodriguez",
    sender_role: "school",
    content:
      "Hello! Alex's annual IEP review is coming up on April 15th at 2:00 PM. Would you be able to attend in person, or would you prefer a virtual meeting? We'll be discussing his progress goals and any accommodations for next year.",
    created_at: "2026-03-31T09:00:00Z",
  },
  {
    id: "msg-2b",
    thread_id: "thread-2",
    thread_subject: "IEP Review Meeting",
    family_id: FAMILY_ID,
    sender_id: PARENT_ID,
    sender_name: "You",
    sender_role: "parent",
    content:
      "Thank you for the heads up! Virtual would work best for me. Could you also share the draft goals ahead of time so I can review them? I have some notes from his OT sessions that might be helpful to include.",
    created_at: "2026-03-31T12:30:00Z",
  },

  // Thread 3: Therapy Progress (4 messages)
  {
    id: "msg-3a",
    thread_id: "thread-3",
    thread_subject: "Therapy Progress",
    family_id: FAMILY_ID,
    sender_id: SARAH_ID,
    sender_name: "Sarah",
    sender_role: "therapist",
    content:
      "Wanted to share a quick update from today's session! Alex did really well with the new sensory regulation exercises. He was able to identify when he was feeling overwhelmed and used the breathing technique on his own.",
    created_at: "2026-03-28T16:00:00Z",
  },
  {
    id: "msg-3b",
    thread_id: "thread-3",
    thread_subject: "Therapy Progress",
    family_id: FAMILY_ID,
    sender_id: PARENT_ID,
    sender_name: "You",
    sender_role: "parent",
    content:
      "That's wonderful! We've been practising the breathing technique at home too. He even used it at the grocery store last weekend when it got too loud.",
    created_at: "2026-03-28T18:15:00Z",
  },
  {
    id: "msg-3c",
    thread_id: "thread-3",
    thread_subject: "Therapy Progress",
    family_id: FAMILY_ID,
    sender_id: SARAH_ID,
    sender_name: "Sarah",
    sender_role: "therapist",
    content:
      "That's exactly the kind of generalisation we're looking for! It shows the skills are really transferring to daily life. For next session, I'd like to introduce a visual feelings chart he can carry with him. Would you be open to trying that at home too?",
    created_at: "2026-03-29T09:30:00Z",
  },
  {
    id: "msg-3d",
    thread_id: "thread-3",
    thread_subject: "Therapy Progress",
    family_id: FAMILY_ID,
    sender_id: PARENT_ID,
    sender_name: "You",
    sender_role: "parent",
    content:
      "Absolutely, that sounds like a great idea. Could you send me a copy of the chart so we can use the same one at home and at school?",
    created_at: "2026-03-29T10:05:00Z",
  },
];

export function getDemoThreads(): DemoThread[] {
  const threadMap = new Map<string, DemoMessage[]>();
  for (const msg of demoMessages) {
    const existing = threadMap.get(msg.thread_id) ?? [];
    existing.push(msg);
    threadMap.set(msg.thread_id, existing);
  }

  return Array.from(threadMap.entries())
    .map(([thread_id, messages]) => {
      const sorted = messages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const last = sorted[sorted.length - 1];
      const participantMap = new Map<string, { name: string; role: string }>();
      for (const m of sorted) {
        if (!participantMap.has(m.sender_id)) {
          participantMap.set(m.sender_id, {
            name: m.sender_name,
            role: m.sender_role,
          });
        }
      }

      return {
        thread_id,
        thread_subject: last.thread_subject,
        family_id: last.family_id,
        last_message: last.content,
        last_message_at: last.created_at,
        last_sender_name: last.sender_name,
        last_sender_role: last.sender_role,
        message_count: sorted.length,
        participants: Array.from(participantMap.values()),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime()
    );
}

export function getDemoThreadMessages(threadId: string): DemoMessage[] {
  return demoMessages
    .filter((m) => m.thread_id === threadId)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}
