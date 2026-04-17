import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePatientLinkId } from "@/lib/team/patient-link";

const ALLOWED_TYPES = ["assessment", "report", "iep", "prescription", "other"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * GET /api/team/documents
 * Returns documents scoped to a specific patient link (family + child).
 * Requires ?patient= (stakeholder_links id).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const patientLinkRaw = request.nextUrl.searchParams.get("patient");
    if (!patientLinkRaw) {
      return NextResponse.json({ error: "patient required" }, { status: 400 });
    }

    const parsed = parsePatientLinkId(patientLinkRaw);
    const { data: link } = await admin
      .from("stakeholder_links")
      .select("family_id, child_agent_id")
      .eq("id", parsed.linkId)
      .eq("stakeholder_id", user.id)
      .single();
    if (!link) return NextResponse.json({ error: "Invalid patient" }, { status: 403 });

    const effectiveChildAgentId = parsed.childAgentIdOverride || link.child_agent_id;

    // Fetch documents scoped to family + child
    let query = admin
      .from("documents")
      .select("*")
      .eq("family_id", link.family_id)
      .order("uploaded_at", { ascending: false });
    if (effectiveChildAgentId) query = query.eq("child_agent_id", effectiveChildAgentId);

    const { data: allDocuments, error: queryError } = await query;
    if (queryError) {
      console.error("Team documents query error:", queryError);
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    // Permission filter: uploader OR has document_permissions row
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

    // Generate signed URLs (same as current)
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const { data: signedUrlData } = await admin.storage
          .from("documents")
          .createSignedUrl(doc.file_path, 3600);
        return { ...doc, download_url: signedUrlData?.signedUrl ?? null };
      })
    );

    return NextResponse.json({ documents: documentsWithUrls });
  } catch (err) {
    console.error("Team documents GET handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function resolveLink(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  patientLinkRaw: string
) {
  const parsed = parsePatientLinkId(patientLinkRaw);
  const { data: linkRow } = await admin
    .from("stakeholder_links")
    .select("family_id, child_agent_id, child_name, role")
    .eq("id", parsed.linkId)
    .eq("stakeholder_id", userId)
    .single();
  if (!linkRow) return null;

  const effectiveChildAgentId = parsed.childAgentIdOverride || linkRow.child_agent_id;
  let effectiveChildName = linkRow.child_name;
  if (parsed.childAgentIdOverride) {
    const { data: familyUser } = await admin.auth.admin.getUserById(linkRow.family_id);
    const children = Array.isArray(familyUser?.user?.user_metadata?.children)
      ? familyUser!.user!.user_metadata!.children
      : [];
    const match = children.find(
      (c: { agentId?: string; childName?: string }) =>
        c?.agentId === parsed.childAgentIdOverride
    );
    if (match?.childName) effectiveChildName = match.childName;
  }
  return {
    ...linkRow,
    child_agent_id: effectiveChildAgentId,
    child_name: effectiveChildName,
  };
}

/**
 * POST /api/team/documents
 * Two modes:
 *   1. JSON body with { mode: "prepare", patient, filename }
 *      → returns { storagePath, token } for direct-to-Supabase upload
 *   2. JSON body with { mode: "finalize", patient, storagePath, title, doc_type, file_name, content_type, size_bytes }
 *      → inserts DB row after client uploaded directly
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const body = await request.json();
    const mode = body.mode;

    if (mode === "prepare") {
      const { patient, filename } = body;
      if (!patient || !filename) {
        return NextResponse.json({ error: "patient and filename required" }, { status: 400 });
      }
      const link = await resolveLink(admin, user.id, patient);
      if (!link) return NextResponse.json({ error: "Invalid patient" }, { status: 403 });

      const timestamp = Date.now();
      const sanitizedName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${link.family_id}/${timestamp}_${sanitizedName}`;

      const { data, error } = await admin.storage
        .from("documents")
        .createSignedUploadUrl(storagePath);
      if (error || !data) {
        console.error("createSignedUploadUrl error:", error);
        return NextResponse.json({ error: "Failed to prepare upload" }, { status: 500 });
      }
      return NextResponse.json({
        storagePath,
        token: data.token,
        signedUrl: data.signedUrl,
      });
    }

    if (mode === "finalize") {
      const { patient, storagePath, title, doc_type: docType, file_name, content_type, size_bytes } = body;
      if (!patient || !storagePath || !title || !docType) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      if (!ALLOWED_TYPES.includes(docType)) {
        return NextResponse.json({ error: `Invalid doc_type. Allowed: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
      }
      if (typeof size_bytes === "number" && size_bytes > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File too large. Maximum size is 20 MB." }, { status: 400 });
      }

      const link = await resolveLink(admin, user.id, patient);
      if (!link) return NextResponse.json({ error: "Invalid patient" }, { status: 403 });

      // Ensure storagePath is scoped to this family (prevents path injection)
      if (!storagePath.startsWith(`${link.family_id}/`)) {
        return NextResponse.json({ error: "Invalid storage path" }, { status: 403 });
      }

      const { data: document, error: insertError } = await admin
        .from("documents")
        .insert({
          family_id: link.family_id,
          child_name: link.child_name,
          child_agent_id: link.child_agent_id,
          uploaded_by: user.id,
          uploader_role: link.role || "stakeholder",
          title,
          doc_type: docType,
          file_path: storagePath,
          metadata: {
            original_filename: file_name,
            content_type,
            size_bytes,
          },
        })
        .select("id, title, file_path")
        .single();

      if (insertError) {
        console.error("Team doc insert error:", insertError);
        await admin.storage.from("documents").remove([storagePath]);
        return NextResponse.json({ error: "Failed to save document record", details: insertError.message }, { status: 500 });
      }

      await admin.from("document_permissions").insert({
        document_id: document.id,
        stakeholder_id: user.id,
        can_view: true,
        granted_by: user.id,
      });

      return NextResponse.json({ success: true, document });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error("Team documents POST handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
