import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  // Fetch the document record
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("file_path, uploaded_by, title")
    .eq("id", id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Authorization: owner or stakeholder with permission
  const isOwner = doc.uploaded_by === user.id;
  if (!isOwner) {
    const { data: perm } = await supabase
      .from("document_permissions")
      .select("can_view")
      .eq("document_id", id)
      .eq("stakeholder_id", user.id)
      .single();

    if (!perm?.can_view) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 3600);

  if (urlError || !signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: signedUrl.signedUrl,
    title: doc.title,
  });
}
