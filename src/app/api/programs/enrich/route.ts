import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/programs/enrich
 *
 * Takes a list of program names from the agent workspace and fuzzy-matches
 * them against the Supabase `programs` table. Returns enriched data that
 * merges agent match info (why, category) with Supabase structured fields
 * (location, dates, eligibility, age range, cost, registration URL, tags).
 *
 * If no Supabase match is found for a program, returns agent data as-is
 * with `enriched: false`.
 */

interface AgentProgram {
  name: string;
  category?: string;
  type?: string;
  cost?: string;
  ages?: string;
  schedule?: string;
  location?: string;
  whyGapFiller?: string;
  register?: string;
  status?: string;
  url?: string;
  phone?: string;
  email?: string;
  isGapFiller?: boolean;
}

interface SupabaseRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  provider_id: string | null;
  provider_name: string | null;
  location: string | null;
  date_start: string | null;
  date_end: string | null;
  eligibility: string | null;
  age_min: number | null;
  age_max: number | null;
  cost: string | null;
  registration_url: string | null;
  tags: string[] | null;
  created_at: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agentPrograms: AgentProgram[] = body.programs ?? [];

    if (agentPrograms.length === 0) {
      return NextResponse.json({ programs: [] });
    }

    const supabase = createAdminClient();

    const enrichedResults = await Promise.all(
      agentPrograms.map(async (agent) => {
        // Extract meaningful name tokens for fuzzy matching
        const nameTokens = agent.name
          .replace(/[,.\-()]/g, " ")
          .split(/\s+/)
          .filter((t) => t.length > 2)
          .map((t) => t.toLowerCase());

        if (nameTokens.length === 0) {
          return { ...agent, enriched: false };
        }

        // Try exact-ish match first (full name ilike)
        let { data } = await supabase
          .from("programs")
          .select(
            "id, title, description, category, provider_id, provider_name, location, date_start, date_end, eligibility, age_min, age_max, cost, registration_url, tags, created_at"
          )
          .ilike("title", `%${agent.name}%`)
          .limit(3);

        // If no match, try with the longest token
        if ((!data || data.length === 0) && nameTokens.length > 0) {
          const longestToken = nameTokens.sort(
            (a, b) => b.length - a.length
          )[0];
          const result = await supabase
            .from("programs")
            .select(
              "id, title, description, category, provider_id, provider_name, location, date_start, date_end, eligibility, age_min, age_max, cost, registration_url, tags, created_at"
            )
            .ilike("title", `%${longestToken}%`)
            .limit(5);
          data = result.data;
        }

        if (!data || data.length === 0) {
          return { ...agent, enriched: false };
        }

        // Pick the best match based on name similarity
        const best = pickBestMatch(agent.name, data);

        if (!best) {
          return { ...agent, enriched: false };
        }

        // Merge: Supabase structured data enriches agent match context
        return {
          // Agent data (match context)
          name: best.title || agent.name,
          category: agent.category,
          whyGapFiller: agent.whyGapFiller,
          isGapFiller: agent.isGapFiller,
          status: agent.status,
          type: agent.type,
          schedule: agent.schedule,
          // Supabase structured data
          supabase_id: best.id,
          description: best.description,
          provider_name: best.provider_name,
          location: best.location || agent.location,
          date_start: best.date_start,
          date_end: best.date_end,
          eligibility: best.eligibility,
          age_min: best.age_min,
          age_max: best.age_max,
          ages: agent.ages,
          cost: best.cost || agent.cost,
          registration_url: best.registration_url || agent.register,
          tags: best.tags,
          url: agent.url,
          phone: agent.phone,
          email: agent.email,
          enriched: true,
        };
      })
    );

    return NextResponse.json({ programs: enrichedResults });
  } catch (error) {
    console.error("Program enrich error:", error);
    return NextResponse.json(
      { error: "Failed to enrich programs" },
      { status: 500 }
    );
  }
}

/**
 * Pick the best matching Supabase row for a given agent program name.
 * Uses simple token-overlap scoring.
 */
function pickBestMatch(
  agentName: string,
  candidates: SupabaseRow[]
): SupabaseRow | null {
  const agentTokens = new Set(
    agentName
      .toLowerCase()
      .replace(/[,.\-()]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );

  let bestScore = 0;
  let bestMatch: SupabaseRow | null = null;

  for (const candidate of candidates) {
    const candidateTokens = candidate.title
      .toLowerCase()
      .replace(/[,.\-()]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    let score = 0;
    for (const token of candidateTokens) {
      if (agentTokens.has(token)) {
        score += token.length;
      }
    }

    const lengthRatio =
      Math.min(agentName.length, candidate.title.length) /
      Math.max(agentName.length, candidate.title.length);
    score *= 0.5 + lengthRatio * 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}
