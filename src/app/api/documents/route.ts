import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/documents
 *
 * Returns all uploaded documents for the logged-in user's family,
 * each with a time-limited signed download URL.
 */
export async function GET() {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Look up family_id
    const { data: familyMember } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .single();

    const familyId = familyMember?.family_id ?? user.id;

    // 3. Fetch documents for this family
    const admin = createAdminClient();
    const { data: documents, error: queryError } = await admin
      .from("documents")
      .select("*")
      .eq("family_id", familyId)
      .order("uploaded_at", { ascending: false });

    if (queryError) {
      console.error("Documents query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    // 4. Generate signed URLs for each document (valid for 1 hour)
    const documentsWithUrls = await Promise.all(
      (documents ?? []).map(async (doc) => {
        const { data: signedUrlData } = await admin.storage
          .from("documents")
          .createSignedUrl(doc.file_path, 3600); // 1 hour

        return {
          ...doc,
          download_url: signedUrlData?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({ documents: documentsWithUrls });
  } catch (err) {
    console.error("Documents GET handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
