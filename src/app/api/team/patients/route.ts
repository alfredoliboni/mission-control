import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PatientRow {
  linkId: string;
  familyId: string;
  childAgentId: string;
  childName: string;
  familyName: string;
  status: "active" | "former";
  unreadCount: number;
  lastMessage: { content: string; createdAt: string } | null;
}

function deriveChildNameFromAgentId(agentId: string): string {
  const suffix = agentId.replace(/^navigator-/, "").split("-")[0] || "Child";
  return suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: members } = await admin
    .from("family_team_members")
    .select("id, family_id, agent_id, child_name, name, status")
    .eq("stakeholder_user_id", user.id)
    .in("status", ["active", "former"]);

  if (!members || members.length === 0) return NextResponse.json({ patients: [] });

  const familyIds = [...new Set(members.map((m) => m.family_id))];

  const familyNamesMap = new Map<string, string>();
  for (const fid of familyIds) {
    const { data } = await admin.auth.admin.getUserById(fid);
    const meta = data?.user?.user_metadata || {};
    const familyName =
      meta.family_name ||
      meta.full_name?.split(" ")[0] ||
      "Family";
    familyNamesMap.set(fid, familyName);
  }

  const patients: PatientRow[] = await Promise.all(
    members.map(async (m) => {
      const childAgentId: string = m.agent_id || "";
      const childName: string =
        m.child_name ||
        (childAgentId ? deriveChildNameFromAgentId(childAgentId) : "Child");

      const scope = admin
        .from("messages")
        .select("content, created_at, read_at, recipient_id, hidden_for_stakeholders")
        .eq("family_id", m.family_id)
        .order("created_at", { ascending: false });

      const scoped = childAgentId
        ? scope.eq("child_agent_id", childAgentId)
        : scope;

      const { data: msgs } = await scoped.limit(50);
      const list = (msgs || []).filter((msg) => {
        const hidden = msg.hidden_for_stakeholders;
        if (!Array.isArray(hidden)) return true;
        return !hidden.includes(user.id);
      });

      const unreadCount = list.filter(
        (msg) => msg.recipient_id === user.id && msg.read_at === null
      ).length;

      const last = list[0];

      return {
        linkId: m.id,
        familyId: m.family_id,
        childAgentId,
        childName,
        familyName: familyNamesMap.get(m.family_id) || "Family",
        status: (m.status === "former" ? "former" : "active") as "active" | "former",
        unreadCount,
        lastMessage: last
          ? { content: last.content, createdAt: last.created_at }
          : null,
      };
    })
  );

  patients.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });

  return NextResponse.json({ patients });
}
