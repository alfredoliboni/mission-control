import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route: forwards requests to the OpenClaw Gateway running on the Mac mini.
 * The Gateway is reached over Tailscale via COMPANION_API_DIRECT.
 *
 * Usage: /api/companion/health → GET ${COMPANION_API_DIRECT}/health
 *        /api/companion/api/files → GET ${COMPANION_API_DIRECT}/api/files
 *        /api/companion/api/parsed/child-profile.md → GET ${COMPANION_API_DIRECT}/api/parsed/child-profile.md
 */

const COMPANION_API_DIRECT = process.env.COMPANION_API_DIRECT || "";
const COMPANION_API_TOKEN = process.env.COMPANION_API_TOKEN || "";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const apiPath = pathSegments.join("/");

  if (!COMPANION_API_DIRECT) {
    return NextResponse.json(
      { error: "Companion API not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${COMPANION_API_DIRECT}/${apiPath}`, {
      headers: {
        Authorization: `Bearer ${COMPANION_API_TOKEN}`,
      },
    });
    const body = await response.text();
    try {
      return NextResponse.json(JSON.parse(body), { status: response.status });
    } catch {
      return new NextResponse(body, { status: response.status });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to proxy to companion API", details: String(err) },
      { status: 502 }
    );
  }
}
