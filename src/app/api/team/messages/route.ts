import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePatientLinkId } from "@/lib/team/patient-link";

/**
 * GET /api/team/messages
 * Returns message threads for the stakeholder's linked families.
 * Supports ?patient=<linkId> for per-patient filtering (takes precedence).
 * Falls back to legacy ?family_id= for backward compatibility.
 * Filters to threads where this stakeholder has participated.
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

  // Find linked families (accepted only) — include id and child_agent_id for patient filtering
  const { data: links } = await admin
    .from("stakeholder_links")
    .select("id, family_id, child_agent_id")
    .eq("stakeholder_id", user.id)
    .or("status.eq.accepted,status.is.null");

  if (!links || links.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  const patientLinkRaw = request.nextUrl.searchParams.get("patient");
  const requestedFamilyId = request.nextUrl.searchParams.get("family_id");

  let activeLink: { id: string; family_id: string; child_agent_id: string | null } | null = null;

  // ?patient= takes precedence over ?family_id=. Supports compound linkIds.
  if (patientLinkRaw) {
    const parsed = parsePatientLinkId(patientLinkRaw);
    const found = links.find((l) => l.id === parsed.linkId);
    if (!found) {
      return NextResponse.json({ error: "Unauthorized family access" }, { status: 403 });
    }
    // Override child_agent_id when compound linkId provides one
    activeLink = {
      ...found,
      child_agent_id: parsed.childAgentIdOverride || found.child_agent_id,
    };
  } else if (requestedFamilyId) {
    const familyIds = links.map((l) => l.family_id);
    if (!familyIds.includes(requestedFamilyId)) {
      return NextResponse.json({ error: "Unauthorized family access" }, { status: 403 });
    }
    // Pick the first link matching the requested family_id
    activeLink = links.find((l) => l.family_id === requestedFamilyId) ?? null;
  }

  // Build messages query
  let messagesQuery = admin
    .from("messages")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (activeLink) {
    messagesQuery = messagesQuery.eq("family_id", activeLink.family_id);
    if (activeLink.child_agent_id) {
      messagesQuery = messagesQuery.eq("child_agent_id", activeLink.child_agent_id);
    }
  } else {
    // No patient param — fall back to all linked families
    const familyIds = links.map((l) => l.family_id);
    messagesQuery = messagesQuery.in("family_id", familyIds);
  }

  const familyIdsForStakeholders = activeLink
    ? [activeLink.family_id]
    : links.map((l) => l.family_id);

  const [messagesResult, stakeholdersResult] = await Promise.all([
    messagesQuery,
    admin
      .from("stakeholder_links")
      .select("stakeholder_id, family_id, name, role, organization")
      .in("family_id", familyIdsForStakeholders),
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
    child_agent_id?: string | null;
    thread_id: string;
    thread_subject: string;
    sender_id: string;
    sender_role: string;
    sender_name?: string;
    recipient_id?: string;
    recipient_name?: string;
    content: string;
    created_at: string;
    deleted_at?: string | null;
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
 * Supports `patient` (linkId) in body for per-patient targeting.
 * Falls back to legacy `family_id` for backward compatibility.
 * Stamps child_agent_id on the row and fires a family email notification.
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

  // Verify stakeholder link (accepted only) — include all fields needed for email + child stamping
  const { data: links } = await admin
    .from("stakeholder_links")
    .select("id, family_id, child_agent_id, child_name, role, name")
    .eq("stakeholder_id", user.id)
    .or("status.eq.accepted,status.is.null");

  if (!links || links.length === 0) {
    return NextResponse.json(
      { error: "Not a linked stakeholder" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    thread_id,
    new_thread_subject,
    content,
    recipient_id,
    recipient_name,
    family_id: requestedFamilyId,
    patient: patientLinkId,
  } = body as {
    thread_id?: string;
    new_thread_subject?: string;
    content: string;
    recipient_id?: string;
    recipient_name?: string;
    family_id?: string;
    patient?: string;
  };

  // Resolve activeLink: patient > family_id > first link
  let activeLink: {
    id: string;
    family_id: string;
    child_agent_id: string | null;
    child_name: string | null;
    role: string | null;
    name: string | null;
  };

  if (patientLinkId) {
    const parsed = parsePatientLinkId(patientLinkId);
    const found = links.find((l) => l.id === parsed.linkId);
    if (!found) {
      return NextResponse.json(
        { error: "Patient link not found" },
        { status: 400 }
      );
    }

    // If compound linkId, override child_agent_id and resolve child_name from family metadata
    let resolvedChildName = found.child_name;
    if (parsed.childAgentIdOverride) {
      const { data: familyUser } = await admin.auth.admin.getUserById(found.family_id);
      const children = Array.isArray(familyUser?.user?.user_metadata?.children)
        ? familyUser!.user!.user_metadata!.children
        : [];
      const match = children.find(
        (c: { agentId?: string; childName?: string }) =>
          c?.agentId === parsed.childAgentIdOverride
      );
      if (match?.childName) resolvedChildName = match.childName;
    }

    activeLink = {
      ...found,
      child_agent_id: parsed.childAgentIdOverride || found.child_agent_id,
      child_name: resolvedChildName,
    };
  } else if (requestedFamilyId) {
    activeLink =
      links.find((l) => l.family_id === requestedFamilyId) ?? links[0];
  } else {
    activeLink = links[0];
  }

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const senderRole = activeLink.role || "stakeholder";
  const senderName = activeLink.name || senderRole;

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
      family_id: activeLink.family_id,
      child_agent_id: activeLink.child_agent_id || null,
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

  // Fire-and-forget email notification to the family
  (async () => {
    try {
      const { sendMessageNotificationEmail } = await import("@/lib/email");
      const { data: familyUser } = await admin.auth.admin.getUserById(
        activeLink.family_id
      );
      const familyEmail = familyUser?.user?.email;
      if (familyEmail) {
        await sendMessageNotificationEmail({
          to: familyEmail,
          senderName,
          childName: activeLink.child_name || "your child",
        });
      }
    } catch (e) {
      console.error("[team/messages] email notify failed:", e);
    }
  })();

  return NextResponse.json({ success: true, message });
}
