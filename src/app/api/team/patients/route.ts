import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PatientRow {
  linkId: string;
  familyId: string;
  childAgentId: string;
  childName: string;
  familyName: string;
  unreadCount: number;
  lastMessage: { content: string; createdAt: string } | null;
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: links } = await admin
    .from("stakeholder_links")
    .select("id, family_id, child_agent_id, child_name, name")
    .eq("stakeholder_id", user.id)
    .or("status.eq.accepted,status.is.null");

  if (!links || links.length === 0) return NextResponse.json({ patients: [] });

  const familyIds = [...new Set(links.map((l) => l.family_id))];

  // Batch: family display names
  const familyNamesMap = new Map<string, string>();
  for (const fid of familyIds) {
    const { data } = await admin.auth.admin.getUserById(fid);
    const meta = data?.user?.user_metadata || {};
    familyNamesMap.set(fid, meta.family_name || meta.full_name?.split(" ")[0] || "Family");
  }

  // For each link, compute unread + last message scoped to child_agent_id
  const patients: PatientRow[] = await Promise.all(
    links.map(async (link) => {
      const scope = admin
        .from("messages")
        .select("content, created_at, read_at, recipient_id")
        .eq("family_id", link.family_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const scoped = link.child_agent_id
        ? scope.eq("child_agent_id", link.child_agent_id)
        : scope;

      const { data: msgs } = await scoped.limit(50);
      const list = msgs || [];

      const unreadCount = list.filter(
        (m) => m.recipient_id === user.id && m.read_at === null
      ).length;

      const last = list[0];

      return {
        linkId: link.id,
        familyId: link.family_id,
        childAgentId: link.child_agent_id || "",
        childName: link.child_name || "Child",
        familyName: familyNamesMap.get(link.family_id) || "Family",
        unreadCount,
        lastMessage: last
          ? { content: last.content, createdAt: last.created_at }
          : null,
      };
    })
  );

  // Sort: patients with newer last messages first
  patients.sort((a, b) => {
    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });

  return NextResponse.json({ patients });
}
