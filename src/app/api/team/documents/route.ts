import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["assessment", "report", "iep", "prescription", "other"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * GET /api/team/documents
 * Returns documents that this stakeholder has uploaded or been shared.
 * Accepts optional ?family_id= to filter by a specific family.
 */
export async function GET(request: NextRequest) {
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

    // Find linked families (accepted only)
    const { data: links } = await admin
      .from("stakeholder_links")
      .select("family_id")
      .eq("stakeholder_id", user.id)
      .or("status.eq.accepted,status.is.null");

    if (!links || links.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    // If family_id is specified, filter to that family (must be in linked set)
    const requestedFamilyId = request.nextUrl.searchParams.get("family_id");
    let familyIds = links.map((l) => l.family_id);

    if (requestedFamilyId) {
      if (!familyIds.includes(requestedFamilyId)) {
        return NextResponse.json({ error: "Unauthorized family access" }, { status: 403 });
      }
      familyIds = [requestedFamilyId];
    }

    // Fetch documents belonging to linked families
    const { data: allDocuments, error: queryError } = await admin
      .from("documents")
      .select("*")
      .in("family_id", familyIds)
      .order("uploaded_at", { ascending: false });

    if (queryError) {
      console.error("Team documents query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    // Filter: only return documents uploaded by this user OR explicitly shared with them
    const docIds = (allDocuments ?? []).map((d) => d.id);
    let permittedDocIds = new Set<string>();

    if (docIds.length > 0) {
      const { data: perms } = await admin
        .from("document_permissions")
        .select("document_id")
        .eq("stakeholder_id", user.id)
        .eq("can_view", true)
        .in("document_id", docIds);

      permittedDocIds = new Set((perms ?? []).map((p) => p.document_id));
    }

    const documents = (allDocuments ?? []).filter(
      (doc) => doc.uploaded_by === user.id || permittedDocIds.has(doc.id)
    );

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

    // Verify stakeholder and get family_id(s) (accepted only)
    const { data: links } = await admin
      .from("stakeholder_links")
      .select("family_id, role")
      .eq("stakeholder_id", user.id)
      .or("status.eq.accepted,status.is.null");

    if (!links || links.length === 0) {
      return NextResponse.json(
        { error: "Not a linked stakeholder" },
        { status: 403 }
      );
    }

    // Parse form data (once — includes file, title, doc_type, and optional family_id)
    const formData = await request.formData();

    // Allow specifying which family to upload to (for multi-family stakeholders)
    const requestedFamilyId = formData.get("family_id") as string | null;
    const linkedFamilyIds = links.map((l) => l.family_id);

    let familyId: string;
    let uploaderRole: string;

    if (requestedFamilyId && linkedFamilyIds.includes(requestedFamilyId)) {
      familyId = requestedFamilyId;
      uploaderRole = links.find((l) => l.family_id === requestedFamilyId)?.role || "stakeholder";
    } else {
      familyId = links[0].family_id;
      uploaderRole = links[0].role || "stakeholder";
    }
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
