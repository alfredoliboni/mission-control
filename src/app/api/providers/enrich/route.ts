import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/providers/enrich
 *
 * Takes a list of provider names from the agent workspace and fuzzy-matches
 * them against the Supabase `providers` table. Returns enriched data that
 * merges agent match info (why, priority) with Supabase structured fields
 * (phone, email, address, price, services, funding, etc.).
 *
 * If no Supabase match is found for a provider, returns agent data as-is
 * with `enriched: false`.
 */

interface AgentProvider {
  name: string;
  type?: string;
  services?: string;
  relevance?: string;
  waitlist?: string;
  contact?: string;
  funding?: string;
  notes?: string;
  priority?: string;
  isGapFiller?: boolean;
}

interface SupabaseRow {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  specialties: string[] | null;
  services: string[] | null;
  location_address: string | null;
  location_city: string | null;
  location_postal: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  waitlist_estimate: string | null;
  is_verified: boolean;
  rating: number | null;
  price_range: string | null;
  accepts_funding: string[] | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agentProviders: AgentProvider[] = body.providers ?? [];

    if (agentProviders.length === 0) {
      return NextResponse.json({ providers: [] });
    }

    const supabase = createAdminClient();

    // Build fuzzy name queries for all agent providers.
    // We search each name using ilike with wildcards around the core name parts.
    const enrichedResults = await Promise.all(
      agentProviders.map(async (agent) => {
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
          .from("providers")
          .select(
            "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
          )
          .ilike("name", `%${agent.name}%`)
          .limit(3);

        // If no match, try with the first significant token (usually the surname)
        if ((!data || data.length === 0) && nameTokens.length > 0) {
          // Try the longest token first (most likely the unique surname)
          const longestToken = nameTokens.sort(
            (a, b) => b.length - a.length
          )[0];
          const result = await supabase
            .from("providers")
            .select(
              "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
            )
            .ilike("name", `%${longestToken}%`)
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

        // Merge: Supabase structured data takes precedence for contact fields,
        // agent data provides the "why" context
        return {
          // Agent data (match context)
          name: best.name || agent.name,
          relevance: agent.relevance,
          priority: agent.priority,
          isGapFiller: agent.isGapFiller,
          notes: agent.notes,
          // Supabase structured data
          supabase_id: best.id,
          type: best.type || agent.type,
          description: best.description,
          specialties: best.specialties,
          services_array: best.services,
          services_text: agent.services,
          location_address: best.location_address,
          location_city: best.location_city,
          location_postal: best.location_postal,
          phone: best.phone,
          email: best.email,
          website: best.website,
          waitlist_estimate: best.waitlist_estimate || agent.waitlist,
          is_verified: best.is_verified,
          rating: best.rating,
          price_range: best.price_range,
          accepts_funding: best.accepts_funding,
          funding_text: agent.funding,
          enriched: true,
        };
      })
    );

    return NextResponse.json({ providers: enrichedResults });
  } catch (error) {
    console.error("Provider enrich error:", error);
    return NextResponse.json(
      { error: "Failed to enrich providers" },
      { status: 500 }
    );
  }
}

/**
 * Pick the best matching Supabase row for a given agent provider name.
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
    const candidateTokens = candidate.name
      .toLowerCase()
      .replace(/[,.\-()]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    let score = 0;
    for (const token of candidateTokens) {
      if (agentTokens.has(token)) {
        score += token.length; // Weight by token length — longer matches are better
      }
    }

    // Bonus for name length similarity (penalize wildly different names)
    const lengthRatio =
      Math.min(agentName.length, candidate.name.length) /
      Math.max(agentName.length, candidate.name.length);
    score *= 0.5 + lengthRatio * 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  // Require at least some meaningful overlap
  return bestScore >= 2 ? bestMatch : null;
}
