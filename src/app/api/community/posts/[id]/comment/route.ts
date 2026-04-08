import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content, isAnonymous } = body;

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Comment content is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify post exists
  const { data: post } = await admin
    .from("community_posts")
    .select("id")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const authorName =
    isAnonymous !== false
      ? "Anonymous Parent"
      : user.user_metadata?.full_name || user.email || "Community Member";

  const { data: comment, error } = await admin
    .from("community_comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      author_name: authorName,
      is_anonymous: isAnonymous !== false,
      content: content.trim(),
      upvotes: 0,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    comment: {
      id: comment.id,
      author: comment.author_name,
      content: comment.content,
      createdAt: comment.created_at,
      upvotes: comment.upvotes,
    },
  });
}
