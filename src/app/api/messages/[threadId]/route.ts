import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

// GET /api/messages/[threadId] — get all messages in a thread
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;

  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  return NextResponse.json({ messages });
}
