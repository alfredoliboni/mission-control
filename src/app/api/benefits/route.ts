import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBenefits, updateBenefitStatus } from "@/lib/supabase/queries/benefits";

/**
 * GET /api/benefits?agent=navigator-{family}-{child}
 * Returns benefits array for the authenticated family, optionally filtered by agent.
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
    const benefits = await getBenefits(supabase, user.id, agentId);

    return NextResponse.json(benefits);
  } catch (err) {
    console.error("[api/benefits GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/benefits
 * Body: { benefitId, status, dates?: { applied?, approved?, renewal? } }
 * Updates the status (and optional date fields) of a benefit.
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
    const {
      benefitId,
      status,
      dates,
    }: {
      benefitId: string;
      status: string;
      dates?: { applied?: string; approved?: string; renewal?: string };
    } = body;

    if (!benefitId) {
      return NextResponse.json({ error: "benefitId is required" }, { status: 400 });
    }
    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    await updateBenefitStatus(supabase, benefitId, status, dates);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/benefits PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
