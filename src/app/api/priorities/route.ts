import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPriorities } from "@/lib/supabase/queries/priorities";

/**
 * GET /api/priorities?agent=navigator-{family}-{child}
 * Returns active priorities for the authenticated family, optionally per-agent.
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
    const priorities = await getPriorities(supabase, user.id, agentId);

    return NextResponse.json(priorities);
  } catch (err) {
    console.error("[api/priorities GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
