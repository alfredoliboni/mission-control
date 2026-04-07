import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/programs/search?q=social+skills&category=gap_filler&age_min=3&age_max=6&cost=free
 * Searches the Supabase `programs` table.
 * Returns matching programs with all fields.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const ageMin = searchParams.get("age_min")?.trim() || "";
  const ageMax = searchParams.get("age_max")?.trim() || "";
  const cost = searchParams.get("cost")?.trim() || "";

  const supabase = createAdminClient();

  let query = supabase
    .from("programs")
    .select(
      "id, title, description, category, provider_id, provider_name, location, date_start, date_end, eligibility, age_min, age_max, cost, registration_url, tags, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  // Full-text / ilike search across title, description
  if (q) {
    query = query.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,eligibility.ilike.%${q}%`
    );
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (ageMin) {
    const min = parseInt(ageMin, 10);
    if (!isNaN(min)) {
      query = query.gte("age_max", min);
    }
  }

  if (ageMax) {
    const max = parseInt(ageMax, 10);
    if (!isNaN(max)) {
      query = query.lte("age_min", max);
    }
  }

  if (cost === "free") {
    query = query.or("cost.ilike.%free%,cost.ilike.%$0%,cost.is.null");
  } else if (cost === "paid") {
    query = query.not("cost", "ilike", "%free%").not("cost", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Program search error:", error);
    return NextResponse.json(
      { error: "Failed to search programs" },
      { status: 500 }
    );
  }

  let results = data ?? [];

  // If we have a query term, also search the tags array column
  if (q && results.length < 50) {
    const lowerQ = q.toLowerCase();
    const { data: tagMatches } = await supabase
      .from("programs")
      .select(
        "id, title, description, category, provider_id, provider_name, location, date_start, date_end, eligibility, age_min, age_max, cost, registration_url, tags, created_at"
      )
      .contains("tags", [lowerQ])
      .limit(20);

    if (tagMatches) {
      const existingIds = new Set(results.map((r) => r.id));
      for (const match of tagMatches) {
        if (!existingIds.has(match.id)) {
          results.push(match);
        }
      }
    }

    // Re-apply filters to tag matches
    if (category) {
      results = results.filter((r) => r.category === category);
    }
    if (ageMin) {
      const min = parseInt(ageMin, 10);
      if (!isNaN(min)) {
        results = results.filter((r) => r.age_max == null || r.age_max >= min);
      }
    }
    if (ageMax) {
      const max = parseInt(ageMax, 10);
      if (!isNaN(max)) {
        results = results.filter((r) => r.age_min == null || r.age_min <= max);
      }
    }
  }

  return NextResponse.json({ programs: results });
}
