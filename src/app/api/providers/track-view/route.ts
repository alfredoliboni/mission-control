import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/providers/track-view
 * Fire-and-forget endpoint to increment a provider's view count.
 * Uses `review_count` column on the `providers` table as the view counter.
 * Public (no auth required) — added to PUBLIC_API_PREFIXES in middleware.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId } = body;

    if (!providerId) {
      return NextResponse.json(
        { error: "providerId required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Read current view count
    const { data: provider } = await admin
      .from("providers")
      .select("review_count")
      .eq("id", providerId)
      .single();

    if (provider) {
      await admin
        .from("providers")
        .update({ review_count: (provider.review_count || 0) + 1 })
        .eq("id", providerId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Track view error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
