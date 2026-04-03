import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  // Fetch documents the user owns or has permission to view
  const role = user.user_metadata?.role;

  if (role === "parent") {
    // Parents see their own uploaded documents
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("uploaded_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ documents: data });
  }

  // Stakeholders see documents shared with them via document_permissions
  const { data: permissions } = await supabase
    .from("document_permissions")
    .select("document_id")
    .eq("stakeholder_id", user.id)
    .eq("can_view", true);

  const docIds = permissions?.map((p) => p.document_id) ?? [];

  if (docIds.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .in("id", docIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const docType = formData.get("doc_type") as string | null;
  const familyId = formData.get("family_id") as string | null;
  const childNickname = formData.get("child_nickname") as string | null;

  if (!file || !title || !docType || !familyId) {
    return NextResponse.json(
      { error: "Missing required fields: file, title, doc_type, family_id" },
      { status: 400 }
    );
  }

  const role = user.user_metadata?.role ?? "parent";
  const filePath = `${familyId}/${Date.now()}-${file.name}`;

  // Upload to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  // Create documents row
  const { data: doc, error: dbError } = await supabase
    .from("documents")
    .insert({
      family_id: familyId,
      child_nickname: childNickname,
      uploaded_by: user.id,
      uploader_role: role,
      title,
      doc_type: docType,
      file_path: filePath,
      metadata: {
        original_name: file.name,
        size: file.size,
        mime_type: file.type,
      },
    })
    .select("id")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ id: doc.id, file_path: filePath }, { status: 201 });
}
