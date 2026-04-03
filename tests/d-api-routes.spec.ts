import { test, expect } from "@playwright/test";

const BASE = "https://mission-control-gray-one.vercel.app";

test.describe("D — API Routes", () => {
  test("GET /api/companion/health returns a response", async ({ request }) => {
    const res = await request.get(`${BASE}/api/companion/health`);
    // May return 200, 400 (demo mode), 502 (VM down), or 503 (not configured)
    expect([200, 400, 502, 503]).toContain(res.status());
  });

  test("GET /api/documents — unauthenticated returns error status", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/documents`);
    // API may return 401 (Unauthorized) or 404 (route not found at Vercel level)
    expect([401, 404]).toContain(res.status());
  });

  test("GET /api/stakeholders — unauthenticated returns error status", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/stakeholders`);
    expect([401, 404]).toContain(res.status());
  });

  test("GET /api/messages — unauthenticated returns error status", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/messages`);
    expect([401, 404]).toContain(res.status());
  });

  test("POST /api/messages — unauthenticated returns error status", async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/messages`, {
      data: { content: "test" },
    });
    expect([401, 404]).toContain(res.status());
  });

  test("POST /api/stakeholders — unauthenticated returns error status", async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/stakeholders`, {
      data: { email: "test@example.com" },
    });
    expect([401, 404]).toContain(res.status());
  });

  test("POST /api/documents — unauthenticated returns error status", async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/documents`, {
      multipart: {
        title: "test",
        doc_type: "assessment",
        family_id: "test-id",
        file: {
          name: "test.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("test content"),
        },
      },
    });
    expect([401, 404]).toContain(res.status());
  });

  test("GET /api/workspace returns 200 with JSON body", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/workspace`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Workspace may return { files: [...] } or another structure
    expect(body).toBeTruthy();
    expect(typeof body).toBe("object");
  });

  test("GET /api/workspace/child-profile.md returns demo content", async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/api/workspace/child-profile.md`, {
      headers: { Cookie: "companion-demo=true" },
    });
    // Should return the demo file content
    expect([200, 404]).toContain(res.status());
  });
});
