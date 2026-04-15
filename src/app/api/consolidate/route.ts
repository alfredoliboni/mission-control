import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addTeamMember, removeTeamMember } from "@/lib/supabase/queries/team-members";
import { insertBenefit } from "@/lib/supabase/queries/benefits";
import { addFamilyProgram } from "@/lib/supabase/queries/family-programs";
import { addFamilyProvider } from "@/lib/supabase/queries/family-providers";

type ConsolidateAction =
  | "provider_accepted"
  | "doctor_accepted"
  | "benefit_applied"
  | "program_enrolled"
  | "member_removed";

interface ConsolidateBody {
  action: ConsolidateAction;
  agentId: string;
  data: {
    name: string;
    role?: string;
    organization?: string;
    services?: string;
    contact?: string;
    email?: string;
    status?: string;
    reason?: string;
    amount?: string;
    type?: string;
    cost?: string;
    ages?: string;
    schedule?: string;
    location?: string;
  };
}

/** Split a contact string into phone/email when possible. */
function splitContact(contact?: string, email?: string): { phone?: string; email?: string } {
  if (!contact && !email) return {};

  // If a dedicated email field is already provided, use it
  const resolvedEmail = email || (contact && contact.includes("@") ? contact : undefined);
  const resolvedPhone = contact && !contact.includes("@") ? contact : undefined;

  return {
    phone: resolvedPhone || undefined,
    email: resolvedEmail || undefined,
  };
}

// ── Main handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: ConsolidateBody = await request.json();
    const { action, agentId, data } = body;

    if (!action || !agentId || !data?.name) {
      return NextResponse.json(
        { error: "action, agentId, and data.name are required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "provider_accepted": {
        const { phone, email } = splitContact(data.contact, data.email);

        // Insert into family_providers
        await addFamilyProvider(supabase, {
          familyId: user.id,
          agentId,
          providerName: data.name,
          status: "active",
        });

        // Insert into family_team_members — provider becomes care team member
        await addTeamMember(supabase, {
          familyId: user.id,
          agentId,
          name: data.name,
          role: data.role ?? "Provider",
          organization: data.organization,
          services: data.services,
          phone,
          email,
          status: "active",
          source: "consolidate",
        });
        break;
      }

      case "doctor_accepted": {
        const { phone, email } = splitContact(data.contact, data.email);

        // Insert into family_team_members only
        await addTeamMember(supabase, {
          familyId: user.id,
          agentId,
          name: data.name,
          role: data.role ?? "Doctor",
          organization: data.organization,
          services: data.services,
          phone,
          email,
          status: "active",
          source: "consolidate",
        });
        break;
      }

      case "member_removed": {
        // Find the active member by name in family_team_members
        const { data: rows, error: findError } = await supabase
          .from("family_team_members")
          .select("id")
          .eq("family_id", user.id)
          .eq("name", data.name)
          .eq("status", "active")
          .limit(1);

        if (findError) {
          throw new Error(`member_removed lookup: ${findError.message}`);
        }

        if (rows && rows.length > 0) {
          await removeTeamMember(
            supabase,
            rows[0].id,
            data.reason ?? "Removed by family"
          );
        }

        // Set family_providers status to 'declined' if they exist there
        await supabase
          .from("family_providers")
          .update({ status: "declined", updated_at: new Date().toISOString() })
          .eq("family_id", user.id)
          .eq("provider_name", data.name)
          .neq("status", "declined");

        break;
      }

      case "benefit_applied": {
        await insertBenefit(supabase, {
          familyId: user.id,
          agentId,
          benefitName: data.name,
          status: "pending",
          amount: data.amount,
          appliedDate: new Date().toISOString().slice(0, 10),
        });
        break;
      }

      case "program_enrolled": {
        await addFamilyProgram(supabase, {
          familyId: user.id,
          agentId,
          programName: data.name,
          status: "enrolled",
          enrolledAt: new Date().toISOString().slice(0, 10),
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${action} processed for ${data.name}`,
    });
  } catch (error) {
    console.error("Consolidate error:", error);
    return NextResponse.json(
      { error: "Failed to process consolidation" },
      { status: 500 }
    );
  }
}
