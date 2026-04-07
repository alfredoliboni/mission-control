import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["assessment", "report", "iep", "prescription", "other"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * POST /api/documents/upload
 *
 * Accepts multipart form data:
 *   file: File
 *   title: string
 *   doc_type: string (assessment | report | iep | prescription | other)
 *   child_nickname: string (optional)
 *
 * Uploads file to Supabase Storage bucket "documents",
 * inserts a row into the documents table, and returns the new record.
 */
export async function POST(request: NextRequest) {
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

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const docType = formData.get("doc_type") as string | null;
    const childNickname = (formData.get("child_nickname") as string) || null;

    if (!file || !title || !docType) {
      return NextResponse.json(
        { error: "Missing required fields: file, title, doc_type" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(docType)) {
      return NextResponse.json(
        { error: `Invalid doc_type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20 MB." },
        { status: 400 }
      );
    }

    // 3. Look up family_id for this user
    const { data: familyMember, error: familyError } = await supabase
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", user.id)
      .single();

    // Fall back: if no family_members table or no row, use user id as family id
    const familyId = familyMember?.family_id ?? user.id;
    const uploaderRole = familyMember?.role ?? "parent";

    if (familyError && familyError.code !== "PGRST116") {
      // PGRST116 = no rows found — that's OK, we fall back
      console.warn("family_members lookup warning:", familyError.message);
    }

    // 4. Upload file to Supabase Storage
    const admin = createAdminClient();
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${familyId}/${timestamp}_${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    // 5. Insert record into documents table
    const { data: document, error: insertError } = await admin
      .from("documents")
      .insert({
        family_id: familyId,
        child_nickname: childNickname,
        uploaded_by: user.id,
        uploader_role: uploaderRole,
        title,
        doc_type: docType,
        file_path: storagePath,
        metadata: {
          original_filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
        },
      })
      .select("id, title, file_path")
      .single();

    if (insertError) {
      console.error("Document insert error:", insertError);
      // Try to clean up the uploaded file
      await admin.storage.from("documents").remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to save document record", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, document });
  } catch (err) {
    console.error("Upload handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
