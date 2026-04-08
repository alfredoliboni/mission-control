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

  const admin = createAdminClient();

  // Verify post exists
  const { data: post } = await admin
    .from("community_posts")
    .select("id, upvotes")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Check existing upvote
  const { data: existing } = await admin
    .from("community_upvotes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  let upvoted: boolean;
  let newUpvotes: number;

  if (existing) {
    // Remove upvote
    await admin
      .from("community_upvotes")
      .delete()
      .eq("id", existing.id);

    newUpvotes = Math.max(0, post.upvotes - 1);
    upvoted = false;
  } else {
    // Add upvote
    await admin
      .from("community_upvotes")
      .insert({
        user_id: user.id,
        post_id: postId,
      });

    newUpvotes = post.upvotes + 1;
    upvoted = true;
  }

  // Update post upvote count
  await admin
    .from("community_posts")
    .update({ upvotes: newUpvotes })
    .eq("id", postId);

  return NextResponse.json({
    upvoted,
    upvotes: newUpvotes,
  });
}
