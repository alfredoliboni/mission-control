import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Helper for API routes: creates Supabase client + validates auth.
 * Returns { supabase, user } on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<
  | { supabase: SupabaseClient; user: User; error?: never }
  | { error: NextResponse; supabase?: never; user?: never }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ),
      };
    }

    return { supabase, user };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
}
