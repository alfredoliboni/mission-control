import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: doc } = await admin
      .from("documents")
      .select("id, uploaded_by, file_path")
      .eq("id", id)
      .single();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (doc.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: "Only the uploader can delete this document" },
        { status: 403 }
      );
    }

    if (doc.file_path) {
      await admin.storage.from("documents").remove([doc.file_path]);
    }

    await admin.from("document_permissions").delete().eq("document_id", id);
    const { error } = await admin.from("documents").delete().eq("id", id);

    if (error) {
      console.error("[api/documents DELETE] row delete failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/documents DELETE] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
