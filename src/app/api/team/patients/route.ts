import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encodePatientLinkId } from "@/lib/team/patient-link";
import { getFamilyAgent } from "@/lib/family-agents";

interface PatientRow {
  linkId: string;
  familyId: string;
  childAgentId: string;
  childName: string;
  familyName: string;
  unreadCount: number;
  lastMessage: { content: string; createdAt: string } | null;
}

interface FamilyChildInfo {
  childName: string;
  agentId: string;
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

  // Batch: family display name + children metadata (for fan-out)
  const familyNamesMap = new Map<string, string>();
  const familyChildrenMap = new Map<string, FamilyChildInfo[]>();
  for (const fid of familyIds) {
    const { data } = await admin.auth.admin.getUserById(fid);
    const meta = data?.user?.user_metadata || {};
    const email = data?.user?.email;

    const familyName =
      meta.family_name ||
      meta.full_name?.split(" ")[0] ||
      "Family";
    familyNamesMap.set(fid, familyName);

    // Build list of known children. Prefer user_metadata.children (dynamic users),
    // fall back to hardcoded FAMILY_AGENT_MAP for legacy families.
    let children: FamilyChildInfo[] = [];
    if (Array.isArray(meta.children) && meta.children.length > 0) {
      children = meta.children
        .filter((c: { agentId?: string }) => c && c.agentId)
        .map((c: { childName?: string; agentId: string }) => ({
          childName: c.childName || "Child",
          agentId: c.agentId,
        }));
    } else {
      const agent = getFamilyAgent(email);
      children = agent.children
        .filter((c) => c.agentId)
        .map((c) => ({ childName: c.childName, agentId: c.agentId }));
    }
    familyChildrenMap.set(fid, children);
  }

  // Expand each link: if it has a specific child_agent_id, keep as-is.
  // Otherwise fan out into one virtual row per known child using compound linkIds.
  interface VirtualLink {
    linkId: string;
    realLinkId: string;
    familyId: string;
    childAgentId: string;
    childName: string;
  }

  const virtualLinks: VirtualLink[] = [];
  for (const link of links) {
    if (link.child_agent_id) {
      virtualLinks.push({
        linkId: link.id,
        realLinkId: link.id,
        familyId: link.family_id,
        childAgentId: link.child_agent_id,
        childName: link.child_name || "Child",
      });
      continue;
    }

    const children = familyChildrenMap.get(link.family_id) || [];
    if (children.length === 0) {
      // Fall back to the raw link — we have no child info to fan out with
      virtualLinks.push({
        linkId: link.id,
        realLinkId: link.id,
        familyId: link.family_id,
        childAgentId: "",
        childName: link.child_name || "Child",
      });
      continue;
    }

    for (const child of children) {
      virtualLinks.push({
        linkId: encodePatientLinkId(link.id, child.agentId),
        realLinkId: link.id,
        familyId: link.family_id,
        childAgentId: child.agentId,
        childName: child.childName,
      });
    }
  }

  // For each virtual link, compute unread + last message scoped to child_agent_id
  const patients: PatientRow[] = await Promise.all(
    virtualLinks.map(async (vl) => {
      const scope = admin
        .from("messages")
        .select("content, created_at, read_at, recipient_id")
        .eq("family_id", vl.familyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const scoped = vl.childAgentId
        ? scope.eq("child_agent_id", vl.childAgentId)
        : scope;

      const { data: msgs } = await scoped.limit(50);
      const list = msgs || [];

      const unreadCount = list.filter(
        (m) => m.recipient_id === user.id && m.read_at === null
      ).length;

      const last = list[0];

      return {
        linkId: vl.linkId,
        familyId: vl.familyId,
        childAgentId: vl.childAgentId,
        childName: vl.childName,
        familyName: familyNamesMap.get(vl.familyId) || "Family",
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
