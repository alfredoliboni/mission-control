import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface SendMessageBody {
  thread_id?: string;
  new_thread_subject?: string;
  recipient_role?: string;
  recipient_id?: string;
  recipient_name?: string;
  content: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SendMessageBody;

  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = user.id;

  // Determine thread_id: use existing or create new
  let threadId = body.thread_id;
  const threadSubject = body.new_thread_subject ?? "New Conversation";

  if (!threadId) {
    // New thread — generate a thread_id and optionally create a conversation record
    threadId = crypto.randomUUID();

    // Create conversation record
    const { error: convError } = await admin.from("conversations").insert({
      id: threadId,
      child_id: familyId,
      participant_ids: [familyId],
      last_message_at: new Date().toISOString(),
    });

    if (convError) {
      console.error("Error creating conversation:", convError);
      // Non-fatal — the message is more important than the conversation record
    }
  } else {
    // Existing thread — update last_message_at
    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);
  }

  // Look up thread subject from existing messages if adding to thread
  let finalSubject = threadSubject;
  if (body.thread_id) {
    const { data: existingMsg } = await admin
      .from("messages")
      .select("thread_subject")
      .eq("thread_id", body.thread_id)
      .limit(1)
      .single();

    if (existingMsg?.thread_subject) {
      finalSubject = existingMsg.thread_subject;
    }
  }

  // Look up sender name from user metadata or default to "Family"
  let senderName = "Family";
  const { data: userData } = await admin.auth.admin.getUserById(familyId);
  if (userData?.user?.user_metadata?.name) {
    senderName = userData.user.user_metadata.name;
  } else if (userData?.user?.email) {
    // Use email prefix as fallback
    senderName = userData.user.email.split("@")[0];
  }

  // Insert the message
  const { data: message, error } = await admin
    .from("messages")
    .insert({
      family_id: familyId,
      thread_id: threadId,
      thread_subject: finalSubject,
      sender_id: familyId,
      sender_role: "parent",
      sender_name: senderName,
      recipient_id: body.recipient_id || null,
      recipient_name: body.recipient_name || null,
      content: body.content.trim(),
      attachments: null,
    })
    .select("id, content, created_at")
    .single();

  if (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message,
  });
}
