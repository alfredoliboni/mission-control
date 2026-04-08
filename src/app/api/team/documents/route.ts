import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["assessment", "report", "iep", "prescription", "other"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * GET /api/team/documents
 * Returns documents that this stakeholder has uploaded or been shared.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Find linked families
    const { data: links } = await admin
      .from("stakeholder_links")
      .select("family_id")
      .eq("stakeholder_id", user.id);

    if (!links || links.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    const familyIds = links.map((l) => l.family_id);

    // Fetch documents: uploaded by this stakeholder OR belonging to linked families
    const { data: documents, error: queryError } = await admin
      .from("documents")
      .select("*")
      .or(`uploaded_by.eq.${user.id},family_id.in.(${familyIds.join(",")})`)
      .order("uploaded_at", { ascending: false });

    if (queryError) {
      console.error("Team documents query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    // Generate signed URLs
    const documentsWithUrls = await Promise.all(
      (documents ?? []).map(async (doc) => {
        const { data: signedUrlData } = await admin.storage
          .from("documents")
          .createSignedUrl(doc.file_path, 3600);

        return {
          ...doc,
          download_url: signedUrlData?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({ documents: documentsWithUrls });
  } catch (err) {
    console.error("Team documents GET handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team/documents
 * Upload a document as a stakeholder (doctor, therapist, school).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify stakeholder and get family_id
    const { data: links } = await admin
      .from("stakeholder_links")
      .select("family_id, role")
      .eq("stakeholder_id", user.id)
      .limit(1);

    if (!links || links.length === 0) {
      return NextResponse.json(
        { error: "Not a linked stakeholder" },
        { status: 403 }
      );
    }

    const familyId = links[0].family_id;
    const uploaderRole = links[0].role || "stakeholder";

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const docType = formData.get("doc_type") as string | null;

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

    // Upload to storage
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
      console.error("Team doc storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    // Insert record
    const { data: document, error: insertError } = await admin
      .from("documents")
      .insert({
        family_id: familyId,
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
      console.error("Team doc insert error:", insertError);
      await admin.storage.from("documents").remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to save document record", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, document });
  } catch (err) {
    console.error("Team documents POST handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
