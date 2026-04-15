import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyPrograms } from "@/lib/supabase/queries/family-programs";

/**
 * GET /api/family-programs?agent=navigator-{family}-{child}
 * Returns FamilyProgram[] for the authenticated family, optionally filtered by agent.
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
    const programs = await getFamilyPrograms(supabase, user.id, agentId);

    return NextResponse.json(programs);
  } catch (err) {
    console.error("[api/family-programs GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
