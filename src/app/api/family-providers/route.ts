import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyProviders } from "@/lib/supabase/queries/family-providers";

/**
 * GET /api/family-providers?agent=navigator-santos-alex
 * Returns FamilyProvider[] for the authenticated family, optionally filtered by agent.
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
    const providers = await getFamilyProviders(supabase, user.id, agentId);

    return NextResponse.json(providers);
  } catch (err) {
    console.error("[api/family-providers GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
