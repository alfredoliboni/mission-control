import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAgent } from "@/lib/family-agents";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

/**
 * GET /api/workspace-live
 * Lists .md files in the logged-in user's agent workspace on Orgo.ai VM.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const family = getFamilyAgent(user?.email ?? undefined);

  if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
    return NextResponse.json({ error: "Orgo API not configured" }, { status: 503 });
  }

  const workspace = `/root/.openclaw/workspace-${family.familyName.toLowerCase()}/memory`;

  try {
    const response = await fetch(ORGO_API_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ORGO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command: `ls ${workspace}/*.md 2>/dev/null | xargs -I{} basename {} | sort`,
      }),
    });

    if (!response.ok) throw new Error(`Orgo API error: ${response.status}`);

    const result = await response.json();
    const files = (result.output || "")
      .split("\n")
      .map((f: string) => f.trim())
      .filter((f: string) => f.endsWith(".md"));

    return NextResponse.json(files);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list workspace files", details: String(err) },
      { status: 502 }
    );
  }
}
