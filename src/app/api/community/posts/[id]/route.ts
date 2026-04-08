import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  // Get current user for upvote status
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Not authenticated
  }

  // Get post
  const { data: post, error: postError } = await admin
    .from("community_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Get comments
  const { data: comments } = await admin
    .from("community_comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  // Check if user upvoted this post
  let upvotedByUser = false;
  if (userId) {
    const { data: upvote } = await admin
      .from("community_upvotes")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", id)
      .maybeSingle();

    upvotedByUser = !!upvote;
  }

  return NextResponse.json({
    post: {
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      tags: post.tags || [],
      author: post.author_name,
      createdAt: post.created_at,
      upvotes: post.upvotes,
      upvotedByUser,
      pinned: post.is_pinned,
    },
    comments: (comments || []).map((c) => ({
      id: c.id,
      author: c.author_name,
      content: c.content,
      createdAt: c.created_at,
      upvotes: c.upvotes,
    })),
  });
}
