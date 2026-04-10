import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  let query = supabase
    .from("providers")
    .select(
      "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
    )
    .order("is_verified", { ascending: false })
    .order("name", { ascending: true })
    .limit(50);

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
    query = query.ilike("location_city", `%${city}%`);
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

  // If we have a query term, also do a second pass for array column matches
  // (services and specialties are text[] — ilike doesn't work on arrays)
  let results = data ?? [];

  if (q && results.length < 50) {
    const lowerQ = q.toLowerCase();
    const upperQ = q.toUpperCase();
    const titleQ = q.charAt(0).toUpperCase() + q.slice(1).toLowerCase();
    // Fetch additional providers that might match via array columns
    // Try multiple cases since PostgreSQL array contains is case-sensitive
    const { data: arrayMatches } = await supabase
      .from("providers")
      .select(
        "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
      )
      .or(`services.cs.{${lowerQ}},services.cs.{${upperQ}},services.cs.{${titleQ}}`)
      .limit(20);

    if (arrayMatches) {
      const existingIds = new Set(results.map((r) => r.id));
      for (const match of arrayMatches) {
        if (!existingIds.has(match.id)) {
          results.push(match);
        }
      }
    }

    // Also try specialties array
    const { data: specMatches } = await supabase
      .from("providers")
      .select(
        "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
      )
      .or(`specialties.cs.{${lowerQ}},specialties.cs.{${upperQ}},specialties.cs.{${titleQ}}`)
      .limit(20);

    if (specMatches) {
      const existingIds = new Set(results.map((r) => r.id));
      for (const match of specMatches) {
        if (!existingIds.has(match.id)) {
          results.push(match);
        }
      }
    }

    // Apply city/type filters to the array matches too
    if (city) {
      const lowerCity = city.toLowerCase();
      results = results.filter(
        (r) => r.location_city?.toLowerCase().includes(lowerCity)
      );
    }
    if (type) {
      const lowerType = type.toLowerCase();
      results = results.filter(
        (r) => r.type?.toLowerCase().includes(lowerType)
      );
    }
  }

  // Fuzzy fallback: if no results and query is 4+ chars, try partial word match
  if (q && results.length === 0 && q.length >= 4) {
    // Try matching with just the first N-1 chars (handles typos at end)
    const partial = q.slice(0, -1);
    const { data: fuzzyResults } = await supabase
      .from("providers")
      .select(
        "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
      )
      .or(`name.ilike.%${partial}%,description.ilike.%${partial}%,type.ilike.%${partial}%`)
      .limit(20);

    if (fuzzyResults && fuzzyResults.length > 0) {
      results = fuzzyResults;
    } else {
      // Try with first 3 chars as prefix
      const prefix = q.slice(0, 3);
      const { data: prefixResults } = await supabase
        .from("providers")
        .select(
          "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
        )
        .or(`name.ilike.%${prefix}%,description.ilike.%${prefix}%`)
        .limit(20);

      if (prefixResults) results = prefixResults;
    }
  }

  return NextResponse.json({ providers: results });
}
