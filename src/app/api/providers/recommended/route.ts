import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Maps extracted need labels to search terms for the Supabase providers table.
 */
const NEED_TO_SERVICE_TERMS: Record<string, string[]> = {
  OT: ["OT", "Occupational", "occupational therapy", "sensory integration", "fine motor"],
  SLP: ["SLP", "Speech", "speech-language", "speech therapy", "language therapy"],
  "ABA/IBI": ["ABA", "IBI", "Applied Behavior", "behavioral therapy", "behaviour"],
  "Social Skills": ["social skills", "social group", "peer interaction", "social"],
  "Sensory Support": ["sensory", "self-regulation", "sensory processing"],
};

/**
 * GET /api/providers/recommended?agent=navigator-santos&needs=OT,SLP&postal=N6A&exclude=Provider+Name1,Provider+Name2
 *
 * Returns Supabase providers matching the child's needs and location.
 * - needs: comma-separated need labels (OT, SLP, ABA/IBI, etc.)
 * - postal: postal code prefix for location filtering
 * - exclude: comma-separated provider names already in the family's providers.md
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const needsParam = searchParams.get("needs") || "";
  const postalParam = searchParams.get("postal") || "";
  const cityParam = searchParams.get("city") || "";
  const excludeParam = searchParams.get("exclude") || "";

  const needs = needsParam
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const excludeNames = excludeParam
    .split(",")
    .map((n) => decodeURIComponent(n.trim()).toLowerCase())
    .filter(Boolean);

  if (needs.length === 0) {
    // Fallback: return all local providers without filtering by needs
    const supabase = createAdminClient();
    const { data } = await supabase.from("providers").select("*").limit(20);
    const filtered = (data || []).filter(
      (p) => !excludeNames.includes((p.name || "").toLowerCase())
    );
    return NextResponse.json({ providers: filtered });
  }

  const supabase = createAdminClient();

  // Build search terms from needs
  const searchTerms: string[] = [];
  for (const need of needs) {
    const terms = NEED_TO_SERVICE_TERMS[need];
    if (terms) {
      searchTerms.push(...terms);
    } else {
      // Use the need label itself as a search term
      searchTerms.push(need);
    }
  }

  // We'll query for providers matching any of the service terms
  // Using multiple approaches since services is a text[] column
  const allResults = new Map<string, Record<string, unknown>>();

  // Strategy 1: Search by name/description/type ilike for each term
  for (const term of searchTerms) {
    const { data } = await supabase
      .from("providers")
      .select(
        "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
      )
      .or(`name.ilike.%${term}%,description.ilike.%${term}%,type.ilike.%${term}%`)
      .limit(30);

    if (data) {
      for (const row of data) {
        if (!allResults.has(row.id)) {
          allResults.set(row.id, { ...row, _matchCount: 1 });
        } else {
          const existing = allResults.get(row.id)!;
          existing._matchCount = (existing._matchCount as number) + 1;
        }
      }
    }
  }

  // Strategy 2: Search services array using contains for each unique short term
  const shortTerms = [...new Set(searchTerms.filter((t) => t.length <= 15))];
  for (const term of shortTerms) {
    const { data } = await supabase
      .from("providers")
      .select(
        "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
      )
      .contains("services", [term])
      .limit(30);

    if (data) {
      for (const row of data) {
        if (!allResults.has(row.id)) {
          allResults.set(row.id, { ...row, _matchCount: 1 });
        } else {
          const existing = allResults.get(row.id)!;
          existing._matchCount = (existing._matchCount as number) + 1;
        }
      }
    }

    // Also try specialties array
    const { data: specData } = await supabase
      .from("providers")
      .select(
        "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
      )
      .contains("specialties", [term])
      .limit(30);

    if (specData) {
      for (const row of specData) {
        if (!allResults.has(row.id)) {
          allResults.set(row.id, { ...row, _matchCount: 1 });
        } else {
          const existing = allResults.get(row.id)!;
          existing._matchCount = (existing._matchCount as number) + 1;
        }
      }
    }
  }

  // Convert to array and filter
  let results = Array.from(allResults.values());

  // Filter by location if provided
  // Handle "London, Ontario" → match on "London"
  const cityName = cityParam.split(",")[0].trim().toLowerCase();

  if (postalParam) {
    const postalPrefix = postalParam.substring(0, 3).toUpperCase();
    results = results.filter((r) => {
      const providerPostal = (r.location_postal as string)?.toUpperCase() || "";
      const providerCity = (r.location_city as string)?.toLowerCase() || "";
      return (
        providerPostal.startsWith(postalPrefix) ||
        providerCity.includes(cityName)
      );
    });

    // If location filter is too strict and returns nothing, include all but deprioritize
    if (results.length === 0) {
      results = Array.from(allResults.values());
    }
  } else if (cityName) {
    const localResults = results.filter((r) =>
      (r.location_city as string)?.toLowerCase().includes(cityName)
    );
    // If we have local results, prefer them; otherwise include all
    if (localResults.length > 0) {
      results = localResults;
    }
  }

  // Exclude providers already in the family's providers.md
  if (excludeNames.length > 0) {
    results = results.filter((r) => {
      const name = (r.name as string).toLowerCase();
      return !excludeNames.some(
        (ex) => name.includes(ex) || ex.includes(name)
      );
    });
  }

  // Sort: verified first, then by match count (descending)
  results.sort((a, b) => {
    // Verified first
    const aVerified = a.is_verified ? 1 : 0;
    const bVerified = b.is_verified ? 1 : 0;
    if (bVerified !== aVerified) return bVerified - aVerified;
    // Then by match count
    return (b._matchCount as number) - (a._matchCount as number);
  });

  // Remove internal _matchCount before returning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cleaned = results.slice(0, 30).map(({ _matchCount, ...rest }) => rest);

  return NextResponse.json({ providers: cleaned });
}
