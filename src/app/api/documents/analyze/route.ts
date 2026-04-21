import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFamilyAgentFlat } from "@/lib/family-agents";

const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse = (mod.default ?? mod) as (b: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return (result.text || "").trim().slice(0, 8000);
}

function extractPlainText(buffer: Buffer): string {
  return buffer.toString("utf8").trim().slice(0, 8000);
}

async function sendToNavigator(prompt: string, agentId: string): Promise<string> {
  const response = await fetch(`${COMPANION_API_DIRECT}/v1/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(55000),
    headers: {
      Authorization: `Bearer ${COMPANION_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `openclaw/${agentId}`,
      messages: [{ role: "user", content: prompt }],
      user: agentId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (content) return content;
  if (result?.error?.message) throw new Error(result.error.message);
  return "The Navigator could not process this document. Please try again.";
}

/**
 * POST /api/documents/analyze
 *
 * Analyzes a document from the Document Vault:
 * 1. Gets document metadata from Supabase
 * 2. Downloads file from Supabase Storage
 * 3. Extracts text locally (pdf-parse for PDFs, utf8 decode otherwise)
 * 4. Sends extracted text to the family's Navigator agent via the Mac mini Gateway
 * 5. Returns agent analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, action } = body as {
      documentId: string;
      action: "summary" | "insights";
    };

    if (!documentId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: documentId, action" },
        { status: 400 },
      );
    }

    if (action !== "summary" && action !== "insights") {
      return NextResponse.json(
        { error: 'Invalid action. Must be "summary" or "insights"' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: doc, error: docError } = await admin
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const { data: familyMember } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .single();

    const userFamilyId = familyMember?.family_id ?? user.id;
    if (doc.family_id !== userFamilyId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const family = getFamilyAgentFlat(user.email ?? undefined);

    if (!COMPANION_API_DIRECT) {
      return NextResponse.json({
        analysis:
          "Navigator agent is not connected. Document analysis is unavailable. Please try again later.",
        source: "fallback",
      });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const downloadUrl = `${SUPABASE_URL}/storage/v1/object/documents/${doc.file_path}`;
    const contentType: string = doc.metadata?.content_type || "application/pdf";
    let extractedText = "";

    try {
      const fileRes = await fetch(downloadUrl, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      });

      if (!fileRes.ok) {
        throw new Error(`Download failed: ${fileRes.status}`);
      }

      const fileBuffer = Buffer.from(await fileRes.arrayBuffer());
      if (contentType.includes("pdf")) {
        extractedText = await extractPdfText(fileBuffer);
      } else {
        extractedText = extractPlainText(fileBuffer);
      }
    } catch (err) {
      console.error("Text extraction failed:", err);
    }

    const docMeta = [
      `Title: ${doc.title}`,
      `Type: ${doc.doc_type}`,
      `Uploaded: ${new Date(doc.uploaded_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      `Uploaded by: ${doc.uploader_role}`,
      doc.child_nickname ? `Child: ${doc.child_nickname}` : null,
      doc.metadata?.original_filename
        ? `Original filename: ${doc.metadata.original_filename}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    let prompt: string;

    if (extractedText && extractedText.length > 50) {
      if (action === "summary") {
        prompt = `I need you to analyze a document from our family's Document Vault. Here are the details:

${docMeta}

Here is the full text extracted from the document:
---
${extractedText}
---

Please provide:
1. **Summary** — A clear, concise summary of the document (2-3 paragraphs)
2. **Key Findings** — The most important points, diagnoses, scores, or recommendations
3. **Action Items** — Specific next steps our family should take based on this document
4. **Deadlines** — Any time-sensitive items or follow-up dates mentioned

Format your response in clear markdown with headers.`;
      } else {
        prompt = `I need your strategic insights on a document from our family's Document Vault. Here are the details:

${docMeta}

Here is the full text extracted from the document:
---
${extractedText}
---

Please provide:
1. **What This Means** — Explain the significance of this document in plain language
2. **Ontario Services Impact** — How this affects our OAP applications, funding eligibility, or school accommodations
3. **Care Team Coordination** — Who on our care team should see this and why
4. **Strategic Recommendations** — How to use this document to strengthen our child's service plan
5. **Related Next Steps** — What I should proactively research or monitor based on this

Format your response in clear markdown with headers.`;
      }
    } else {
      if (action === "summary") {
        prompt = `A document was uploaded to our family's Document Vault, but I couldn't extract the text content. Here are the details I have:

${docMeta}

Based on this document type and context, please:
1. Explain what this type of document typically contains and why it's important
2. Suggest what key information our family should look for in it
3. Recommend next steps for using this document in our child's service plan
4. Note if this document should be shared with specific care team members

Format your response in clear markdown with headers.`;
      } else {
        prompt = `A document was uploaded to our family's Document Vault. I couldn't extract the text, but here are the details:

${docMeta}

Based on this document type, please provide strategic insights:
1. How documents like this typically impact Ontario autism service applications
2. Which care team members should review it
3. How it might strengthen our child's pathway through the system
4. What follow-up actions are usually recommended

Format your response in clear markdown with headers.`;
      }
    }

    const analysis = await sendToNavigator(prompt, family.agentId);

    return NextResponse.json({
      analysis,
      source: extractedText && extractedText.length > 50 ? "full" : "metadata",
      textLength: extractedText?.length || 0,
    });
  } catch (err) {
    console.error("Document analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze document. Please try again." },
      { status: 500 },
    );
  }
}
