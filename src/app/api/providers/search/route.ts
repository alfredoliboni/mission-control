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
  if (q) {
    // Search name, description with ilike. For array columns (services,
    // specialties) we use the contains operator via an OR filter.
    query = query.or(
      `name.ilike.%${q}%,description.ilike.%${q}%,type.ilike.%${q}%`
    );
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
    // Fetch additional providers that might match via array columns
    const { data: arrayMatches } = await supabase
      .from("providers")
      .select(
        "id, name, type, description, specialties, services, location_address, location_city, location_postal, phone, email, website, waitlist_estimate, is_verified, rating, price_range, accepts_funding"
      )
      .contains("services", [lowerQ])
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
      .contains("specialties", [lowerQ])
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

  return NextResponse.json({ providers: results });
}
