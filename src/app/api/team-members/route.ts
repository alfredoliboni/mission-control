import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateMemberContact,
} from "@/lib/supabase/queries/team-members";

/**
 * GET /api/team-members?agent=navigator-{family}-{child}
 * Returns { active: TeamMember[], former: TeamMember[] } for the authenticated family.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentId = request.nextUrl.searchParams.get("agent") ?? undefined;
    const members = await getTeamMembers(supabase, user.id, agentId);

    return NextResponse.json(members);
  } catch (err) {
    console.error("[api/team-members GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/team-members
 * Body: { agentId, name, role, organization?, ... }
 * Adds a new team member with familyId = user.id.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, name, role, organization, services, phone, email, website, childName, status, source, agentNote } = body;

    if (!agentId || !name || !role) {
      return NextResponse.json({ error: "agentId, name, and role are required" }, { status: 400 });
    }

    const member = await addTeamMember(supabase, {
      familyId: user.id,
      agentId,
      name,
      role,
      organization,
      services,
      phone,
      email,
      website,
      childName,
      status,
      source,
      agentNote,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error("[api/team-members POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/team-members
 * Body (remove):  { memberId, action: "remove", reason: string }
 * Body (contact): { memberId, phone?, email?, website? }
 * Calls removeTeamMember or updateMemberContact as appropriate.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, action, reason, phone, email, website, role, organization } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    if (action === "remove") {
      if (!reason) {
        return NextResponse.json({ error: "reason is required when action is remove" }, { status: 400 });
      }
      await removeTeamMember(supabase, memberId, reason);
    } else if (role !== undefined || organization !== undefined) {
      // Update role/organization
      const updates: Record<string, string> = {};
      if (role !== undefined) updates.role = role;
      if (organization !== undefined) updates.organization = organization;

      const { error } = await supabase
        .from("family_team_members")
        .update(updates)
        .eq("id", memberId)
        .eq("family_id", user.id);

      if (error) throw new Error(error.message);
    } else {
      await updateMemberContact(supabase, memberId, { phone, email, website });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/team-members PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
