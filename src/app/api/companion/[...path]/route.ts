import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route: forwards requests to the companion API on the VM.
 * 
 * In production, calls the Orgo.ai bash API which then curls localhost:3001 on the VM.
 * This avoids needing to expose port 3001 externally.
 * 
 * Usage: /api/companion/health → GET localhost:3001/health on VM
 *        /api/companion/api/files → GET localhost:3001/api/files on VM
 *        /api/companion/api/parsed/child-profile.md → GET localhost:3001/api/parsed/child-profile.md on VM
 */

const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID || "";
const ORGO_API_KEY = process.env.ORGO_API_KEY || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";
const ORGO_API_BASE = `https://www.orgo.ai/api/computers/${ORGO_COMPUTER_ID}/bash`;

// For local dev: direct connection to API
const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";

async function proxyViaOrgo(apiPath: string): Promise<{ status: number; body: string }> {
  const curlCmd = `curl -s -H "Authorization: Bearer ${COMPANION_API_TOKEN}" http://localhost:18789/${apiPath}`;
  
  const response = await fetch(ORGO_API_BASE, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ORGO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command: curlCmd }),
  });

  if (!response.ok) {
    return { status: 502, body: JSON.stringify({ error: "Orgo API unreachable" }) };
  }

  const result = await response.json();
  return { status: 200, body: result.output || "{}" };
}

async function proxyDirect(apiPath: string): Promise<{ status: number; body: string }> {
  const response = await fetch(`${COMPANION_API_DIRECT}/${apiPath}`, {
    headers: {
      "Authorization": `Bearer ${COMPANION_API_TOKEN}`,
    },
  });

  return { status: response.status, body: await response.text() };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const apiPath = pathSegments.join("/");

  // Check if Orgo credentials are configured
  if (!ORGO_COMPUTER_ID || !ORGO_API_KEY) {
    if (COMPANION_API_DIRECT) {
      // Direct connection (for local dev or exposed API)
      const result = await proxyDirect(apiPath);
      try {
        return NextResponse.json(JSON.parse(result.body), { status: result.status });
      } catch {
        return new NextResponse(result.body, { status: result.status });
      }
    }
    return NextResponse.json({ error: "Companion API not configured" }, { status: 503 });
  }

  try {
    const result = await proxyViaOrgo(apiPath);
    try {
      return NextResponse.json(JSON.parse(result.body), { status: result.status });
    } catch {
      return new NextResponse(result.body, { status: result.status });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to proxy to companion API", details: String(err) },
      { status: 502 }
    );
  }
}
