import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent } from "@/lib/family-agents";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

/**
 * GET /api/workspace-live/[filename]
 * Reads a raw .md file from the logged-in user's agent workspace on Orgo.ai VM.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename.endsWith(".md")) {
    return NextResponse.json({ error: "Only .md files allowed" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const family = getFamilyAgent(user?.email ?? undefined);

  if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
    return NextResponse.json({ error: "Orgo API not configured" }, { status: 503 });
  }

  const filepath = `/root/.openclaw/workspace-${family.familyName.toLowerCase()}/memory/${filename}`;

  try {
    const response = await fetch(ORGO_API_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ORGO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command: `cat ${filepath} 2>/dev/null || echo "FILE_NOT_FOUND"` }),
    });

    if (!response.ok) throw new Error(`Orgo API error: ${response.status}`);

    const result = await response.json();
    const content = result.output || "";

    if (content.trim() === "FILE_NOT_FOUND") {
      return new NextResponse("File not found", { status: 404 });
    }

    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read workspace file", details: String(err) },
      { status: 502 }
    );
  }
}
