import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAlerts, updateAlertStatus, addAlertNote } from "@/lib/supabase/queries/alerts";

/**
 * GET /api/alerts?agent=navigator-{family}-{child}
 * Returns alerts array for the authenticated family, optionally filtered by agent.
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
    const alerts = await getAlerts(supabase, user.id, agentId);

    return NextResponse.json(alerts);
  } catch (err) {
    console.error("[api/alerts GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/alerts
 * Body: { alertId, action?: "dismiss"|"complete"|"reactivate", note?: string }
 * Calls updateAlertStatus and/or addAlertNote as appropriate.
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
      alertId,
      action,
      note,
    }: { alertId: string; action?: "dismiss" | "complete" | "reactivate"; note?: string } = body;

    if (!alertId) {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    if (action) {
      const statusMap: Record<string, string> = {
        dismiss: "dismissed",
        complete: "completed",
        reactivate: "active",
      };
      const status = statusMap[action];
      if (!status) {
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
      await updateAlertStatus(supabase, alertId, status);
    }

    if (note) {
      await addAlertNote(supabase, alertId, note);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/alerts PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
