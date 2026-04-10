import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Simple trigram similarity (same algorithm as PostgreSQL pg_trgm) */
function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * GET /api/providers/search?q=occupational+therapy&city=London&type=clinic
 * Searches the Supabase `providers` table.
 * Returns matching providers with all fields.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const city = searchParams.get("city")?.trim() || "";
  const type = searchParams.get("type")?.trim() || "";

  const supabase = createAdminClient();

  const limit = q ? 50 : 100; // Show more when browsing without a query

  let query = supabase
    .from("providers")
    .select(
      "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
    )
    .order("is_verified", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);

  // Full-text / ilike search across name, description, services, specialties
  // Also generates fuzzy variants for common typos
  if (q) {
    // Build search variants for fuzzy matching
    const variants = new Set<string>();
    variants.add(q);
    // Common abbreviation expansions
    const expansions: Record<string, string[]> = {
      "ot": ["occupational therapy", "occupational"],
      "slp": ["speech-language pathology", "speech therapy", "speech"],
      "aba": ["applied behavior analysis", "aba therapy", "behaviour"],
      "ibi": ["intensive behavioral intervention"],
      "pt": ["physical therapy", "physiotherapy"],
    };
    const lower = q.toLowerCase();
    if (expansions[lower]) {
      expansions[lower].forEach(e => variants.add(e));
    }
    // Build OR filter with all variants
    const filters = Array.from(variants).flatMap(v => [
      `name.ilike.%${v}%`,
      `description.ilike.%${v}%`,
      `type.ilike.%${v}%`,
    ]);
    query = query.or(filters.join(","));
  }

  if (city) {
    // Handle "London, Ontario" → match on "London"
    const cityName = city.split(",")[0].trim();
    query = query.ilike("location_city", `%${cityName}%`);
  }

  if (type) {
    query = query.ilike("type", `%${type}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Provider search error:", error);
    return NextResponse.json(
      { error: "Failed to search providers" },
      { status: 500 }
    );
  }

  // Second pass: match array columns (services[], specialties[]) via substring
  // PostgreSQL array contains (cs) requires exact element match, so we fetch all
  // providers and do client-side substring matching on array elements
  let results = data ?? [];

  if (q && results.length < limit) {
    const searchTerms = new Set<string>();
    searchTerms.add(q.toLowerCase());
    // Add expansion variants for substring matching
    const expansions: Record<string, string[]> = {
      "ot": ["occupational"],
      "slp": ["speech"],
      "aba": ["behavior", "behaviour", "aba"],
      "ibi": ["behavioral", "intervention"],
      "pt": ["physical", "physiotherapy"],
    };
    const lowerQ = q.toLowerCase();
    if (expansions[lowerQ]) {
      expansions[lowerQ].forEach(e => searchTerms.add(e));
    }

    // Fetch all providers and filter by array column substring match
    const { data: allProviders } = await supabase
      .from("providers")
      .select(
        "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
      )
      .limit(200);

    if (allProviders) {
      const existingIds = new Set(results.map((r) => r.id));
      const terms = Array.from(searchTerms);

      for (const provider of allProviders) {
        if (existingIds.has(provider.id)) continue;

        // Check if any service or specialty contains any search term
        const servicesText = (provider.services || []).join(" ").toLowerCase();
        const specialtiesText = (provider.specialties || []).join(" ").toLowerCase();
        const combined = `${servicesText} ${specialtiesText}`;

        if (terms.some(term => combined.includes(term))) {
          results.push(provider);
          existingIds.add(provider.id);
        }
      }
    }

    // Apply city/type filters to the new matches too
    if (city) {
      const cityName = city.split(",")[0].trim().toLowerCase();
      results = results.filter(
        (r) => r.location_city?.toLowerCase().includes(cityName)
      );
    }
    if (type) {
      const lowerType = type.toLowerCase();
      results = results.filter(
        (r) => r.type?.toLowerCase().includes(lowerType)
      );
    }
  }

  // Fuzzy fallback using pg_trgm similarity (handles real typos)
  if (q && results.length === 0 && q.length >= 3) {
    const { data: fuzzyResults } = await supabase.rpc("search_providers_fuzzy", {
      search_term: q,
      min_similarity: 0.1,
    });

    if (fuzzyResults && fuzzyResults.length > 0) {
      results = fuzzyResults;
    }

    // Also try fuzzy matching against array columns (services/specialties)
    if (results.length === 0) {
      const lowerQ = q.toLowerCase();
      const { data: allProviders } = await supabase
        .from("providers")
        .select(
          "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
        )
        .limit(200);

      if (allProviders) {
        for (const provider of allProviders) {
          const words = [...(provider.services || []), ...(provider.specialties || [])]
            .flatMap(s => s.toLowerCase().split(/\s+/));
          // Check trigram similarity between query and each word
          if (words.some(word => trigramSimilarity(lowerQ, word) > 0.3)) {
            results.push(provider);
          }
        }
      }
    }

    // Last resort: partial prefix match on text columns
    if (results.length === 0) {
      const partial = q.slice(0, -1);
      const { data: partialResults } = await supabase
        .from("providers")
        .select(
          "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
        )
        .or(`name.ilike.%${partial}%,description.ilike.%${partial}%,type.ilike.%${partial}%`)
        .limit(20);

      if (partialResults) results = partialResults;
    }
  }

  return NextResponse.json({ providers: results });
}
