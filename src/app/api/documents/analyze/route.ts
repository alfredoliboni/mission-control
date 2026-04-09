import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFamilyAgent } from "@/lib/family-agents";

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

// ── Demo responses for document analysis ─────────────────────────────
const DEMO_RESPONSES: Record<string, string> = {
  summary: `## Document Summary

**Key Findings:**
- This document contains important information about your child's development and service needs
- Several recommendations are outlined for therapeutic interventions
- Follow-up assessments are suggested within 6 months

**Recommendations:**
1. Continue current therapy sessions (OT and Speech)
2. Request an updated IEP at the next school meeting
3. Apply for additional funding through the OAP

**Action Items:**
- [ ] Schedule follow-up assessment
- [ ] Share this document with your care team
- [ ] Discuss recommendations with your child's therapist

*Note: This is a demo summary. In production, the Navigator agent reads the actual document content and provides specific analysis.*`,

  insights: `## Navigator Insights

**What This Means for Your Family:**
This document provides clinical evidence that supports your child's service applications. Here's how to use it strategically:

**For Ontario Autism Program (OAP):**
- This document strengthens your OAP application
- Key diagnostic codes can be referenced in your next funding request

**For School Accommodations:**
- Share relevant sections with the school's IPRC committee
- Request that IEP goals align with the recommendations in this document

**For Care Team Coordination:**
- I recommend sharing this with Dr. Park and your OT
- The findings may influence therapy goal adjustments

**Next Steps I Can Help With:**
- Finding providers who specialize in the areas mentioned
- Tracking deadlines for follow-up assessments
- Preparing a summary packet for your next IEP meeting

*Note: This is a demo analysis. In production, the Navigator reads the actual document and provides specific, actionable insights.*`,
};

// ── Extract text from document via Orgo VM ───────────────────────────
async function extractTextViaVM(signedUrl: string, contentType: string): Promise<string> {
  const ORGO_EXEC_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/exec`;

  const b64Url = Buffer.from(signedUrl).toString("base64");
  const isPdf = contentType.includes("pdf");

  // Python code to download file and extract text
  // For PDFs: tries PyPDF2 first, falls back to raw text extraction
  // For text files: reads directly
  const pythonCode = isPdf
    ? [
        "import json, urllib.request, base64, re, os",
        `url = base64.b64decode("${b64Url}").decode()`,
        'urllib.request.urlretrieve(url, "/tmp/doc.pdf")',
        "text = ''",
        "try:",
        "    import PyPDF2",
        '    reader = PyPDF2.PdfReader("/tmp/doc.pdf")',
        '    text = "\\n".join(page.extract_text() or "" for page in reader.pages)',
        "except ImportError:",
        "    try:",
        "        import subprocess",
        '        result = subprocess.run(["pdftotext", "/tmp/doc.pdf", "-"], capture_output=True, text=True, timeout=30)',
        "        text = result.stdout",
        "    except Exception:",
        '        with open("/tmp/doc.pdf", "rb") as f:',
        "            raw = f.read()",
        '        decoded = raw.decode("latin-1", errors="ignore")',
        "        parts = re.findall(r'[\\x20-\\x7E]{4,}', decoded)",
        '        text = " ".join(parts)',
        "except Exception as e:",
        '    text = f"[PDF extraction error: {e}]"',
        'text = text.strip()[:8000]',
        'print(json.dumps({"ok": True, "text": text, "length": len(text)}))',
      ].join("\n")
    : [
        "import json, urllib.request, base64",
        `url = base64.b64decode("${b64Url}").decode()`,
        "try:",
        '    resp = urllib.request.urlopen(url, timeout=30)',
        '    raw = resp.read()',
        '    text = raw.decode("utf-8", errors="replace")',
        '    text = text.strip()[:8000]',
        '    print(json.dumps({"ok": True, "text": text, "length": len(text)}))',
        "except Exception as e:",
        '    print(json.dumps({"ok": False, "error": str(e)}))',
      ].join("\n");

  const response = await fetch(ORGO_EXEC_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ORGO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: pythonCode }),
  });

  if (!response.ok) {
    throw new Error(`Orgo VM exec failed: ${response.status}`);
  }

  const result = await response.json();
  const output = (result.output || "").trim();

  try {
    const parsed = JSON.parse(output);
    if (parsed.ok && parsed.text) {
      return parsed.text;
    }
    if (parsed.error) {
      throw new Error(parsed.error);
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      // Output wasn't JSON — return raw output as fallback
      if (output.length > 10) return output.slice(0, 8000);
    }
    throw e;
  }

  return "";
}

// ── Send extracted text to Navigator agent ───────────────────────────
async function sendToNavigator(prompt: string, agentId: string): Promise<string> {
  const ORGO_EXEC_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/exec`;

  const b64Message = Buffer.from(prompt).toString("base64");
  const b64Token = Buffer.from(COMPANION_API_TOKEN).toString("base64");
  const b64AgentId = Buffer.from(agentId).toString("base64");

  const pythonCode = [
    "import json, urllib.request, base64",
    `msg = base64.b64decode("${b64Message}").decode()`,
    `token = base64.b64decode("${b64Token}").decode().strip()`,
    `agent = base64.b64decode("${b64AgentId}").decode().strip()`,
    'payload = json.dumps({"model": "openclaw/" + agent, "messages": [{"role": "user", "content": msg}], "user": agent}).encode()',
    'headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}',
    'req = urllib.request.Request("http://127.0.0.1:18789/v1/chat/completions", data=payload, headers=headers)',
    "try:",
    "    resp = urllib.request.urlopen(req, timeout=120)",
    "    result = json.loads(resp.read().decode())",
    '    content = result["choices"][0]["message"]["content"]',
    '    print(json.dumps({"ok": True, "content": content}))',
    "except Exception as e:",
    '    print(json.dumps({"ok": False, "error": str(e)}))',
  ].join("\n");

  const response = await fetch(ORGO_EXEC_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ORGO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: pythonCode }),
  });

  if (!response.ok) {
    throw new Error(`Orgo VM exec failed: ${response.status}`);
  }

  const result = await response.json();
  const output = (result.output || "").trim();

  try {
    const parsed = JSON.parse(output);
    if (parsed.ok && parsed.content) {
      return parsed.content;
    }
    if (parsed.error) {
      throw new Error(`Navigator error: ${parsed.error}`);
    }
  } catch (e) {
    if (e instanceof SyntaxError && output.length > 10) {
      return output;
    }
    throw e;
  }

  return "The Navigator could not process this document. Please try again.";
}

/**
 * POST /api/documents/analyze
 *
 * Analyzes a document from the Document Vault:
 * 1. Gets document metadata from Supabase
 * 2. Downloads file from Supabase Storage (signed URL)
 * 3. Extracts text via Orgo.ai VM (Python: PyPDF2 / pdftotext / raw)
 * 4. Sends extracted text to the family's Navigator agent
 * 5. Returns agent analysis
 *
 * Request body:
 *   { documentId: string, action: "summary" | "insights" }
 */
export async function POST(request: NextRequest) {
  try {
    // Check demo mode
    const cookieStore = await cookies();
    const isDemo = cookieStore.get("companion-demo")?.value === "true";

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

    // Demo mode: return canned response
    if (isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return NextResponse.json({
        analysis: DEMO_RESPONSES[action],
        source: "demo",
      });
    }

    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get document metadata
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

    // 3. Verify the user belongs to this document's family
    const { data: familyMember } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .single();

    const userFamilyId = familyMember?.family_id ?? user.id;
    if (doc.family_id !== userFamilyId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    // 4. Get the family's Navigator agent
    const family = getFamilyAgent(user.email ?? undefined);

    // Check if Orgo VM is configured
    if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
      // Fallback: return demo response when VM isn't configured
      return NextResponse.json({
        analysis: DEMO_RESPONSES[action],
        source: "fallback",
      });
    }

    // 5. Download document directly with service key
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const downloadUrl = `${SUPABASE_URL}/storage/v1/object/documents/${doc.file_path}`;
    const contentType = doc.metadata?.content_type || "application/pdf";
    let extractedText = "";

    try {
      // Download the file
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
      const b64File = fileBuffer.toString("base64");

      // Send to VM for text extraction
      const ORGO_EXEC_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/exec`;
      const isPdf = contentType.includes("pdf");

      const pythonCode = isPdf
        ? [
            "import json, base64, os",
            `data = base64.b64decode("${b64File}")`,
            'with open("/tmp/doc.pdf", "wb") as f: f.write(data)',
            "text = ''",
            "try:",
            "    import PyPDF2",
            '    reader = PyPDF2.PdfReader("/tmp/doc.pdf")',
            '    text = "\\n".join(page.extract_text() or "" for page in reader.pages)',
            "except Exception as e:",
            '    text = f"[PDF extraction error: {e}]"',
            'text = text.strip()[:8000]',
            'print(json.dumps({"ok": True, "text": text, "length": len(text)}))',
          ].join("\n")
        : [
            "import json, base64",
            `data = base64.b64decode("${b64File}")`,
            'text = data.decode("utf-8", errors="replace").strip()[:8000]',
            'print(json.dumps({"ok": True, "text": text, "length": len(text)}))',
          ].join("\n");

      const vmRes = await fetch(ORGO_EXEC_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ORGO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: pythonCode }),
      });

      if (vmRes.ok) {
        const vmResult = await vmRes.json();
        const output = (vmResult.output || "").trim();
        try {
          const parsed = JSON.parse(output);
          if (parsed.ok && parsed.text) {
            extractedText = parsed.text;
          }
        } catch {
          if (output.length > 10) extractedText = output.slice(0, 8000);
        }
      }
    } catch (err) {
      console.error("Text extraction failed:", err);
    }

    // 7. Build the prompt for the Navigator agent
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
      // We have document content — send it for real analysis
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
      // No document content extracted — ask agent to help based on metadata
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

    // 8. Send to Navigator agent
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
