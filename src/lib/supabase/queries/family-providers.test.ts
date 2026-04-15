import { describe, it, expect } from "vitest";
import {
  mapProviderRow,
  buildProviderInsert,
  type ProviderRow,
  type InsertProviderInput,
} from "./family-providers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<ProviderRow> = {}): ProviderRow {
  return {
    id: "prov-row-uuid-001",
    family_id: "family-uuid-001",
    provider_id: null,
    agent_id: "navigator-santos",
    provider_name: "Kerry's Place Autism Services",
    priority: "highest",
    status: "recommended",
    agent_note: "Best match for ABA in York Region",
    is_gap_filler: false,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
    ...overrides,
  };
}

function makeInput(overrides: Partial<InsertProviderInput> = {}): InsertProviderInput {
  return {
    familyId: "family-uuid-001",
    agentId: "navigator-santos",
    providerName: "Kerry's Place Autism Services",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapProviderRow
// ---------------------------------------------------------------------------

describe("mapProviderRow", () => {
  it("maps all snake_case DB columns to camelCase frontend fields", () => {
    const row = makeRow();
    const result = mapProviderRow(row);

    expect(result.id).toBe("prov-row-uuid-001");
    expect(result.familyId).toBe("family-uuid-001");
    expect(result.providerId).toBeNull();
    expect(result.agentId).toBe("navigator-santos");
    expect(result.providerName).toBe("Kerry's Place Autism Services");
    expect(result.priority).toBe("highest");
    expect(result.status).toBe("recommended");
    expect(result.agentNote).toBe("Best match for ABA in York Region");
    expect(result.isGapFiller).toBe(false);
    expect(result.createdAt).toBe("2026-04-01T10:00:00Z");
    expect(result.updatedAt).toBe("2026-04-01T10:00:00Z");
  });

  it("maps provider_id when present", () => {
    const row = makeRow({ provider_id: "prov-catalog-uuid-042" });
    const result = mapProviderRow(row);

    expect(result.providerId).toBe("prov-catalog-uuid-042");
  });

  it("defaults is_gap_filler null to false", () => {
    const row = makeRow({ is_gap_filler: null });
    const result = mapProviderRow(row);

    expect(result.isGapFiller).toBe(false);
  });

  it("preserves is_gap_filler true correctly", () => {
    const row = makeRow({ is_gap_filler: true });
    const result = mapProviderRow(row);

    expect(result.isGapFiller).toBe(true);
  });

  it("maps all valid status values correctly", () => {
    const statuses = ["recommended", "contacted", "waitlisted", "active", "declined"] as const;

    for (const status of statuses) {
      const result = mapProviderRow(makeRow({ status }));
      expect(result.status).toBe(status);
    }
  });

  it("maps all valid priority values correctly", () => {
    const priorities = ["highest", "relevant", "other"] as const;

    for (const priority of priorities) {
      const result = mapProviderRow(makeRow({ priority }));
      expect(result.priority).toBe(priority);
    }
  });

  it("maps null agent_note as null", () => {
    const row = makeRow({ agent_note: null });
    const result = mapProviderRow(row);

    expect(result.agentNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildProviderInsert
// ---------------------------------------------------------------------------

describe("buildProviderInsert", () => {
  it("builds insert payload with required fields and snake_case keys", () => {
    const input = makeInput();
    const payload = buildProviderInsert(input);

    expect(payload.family_id).toBe("family-uuid-001");
    expect(payload.agent_id).toBe("navigator-santos");
    expect(payload.provider_name).toBe("Kerry's Place Autism Services");
  });

  it("defaults status to recommended when not provided", () => {
    const input = makeInput();
    const payload = buildProviderInsert(input);

    expect(payload.status).toBe("recommended");
  });

  it("uses provided status when supplied", () => {
    const input = makeInput({ status: "active" });
    const payload = buildProviderInsert(input);

    expect(payload.status).toBe("active");
  });

  it("defaults priority to relevant when not provided", () => {
    const input = makeInput();
    const payload = buildProviderInsert(input);

    expect(payload.priority).toBe("relevant");
  });

  it("uses provided priority when supplied", () => {
    const input = makeInput({ priority: "highest" });
    const payload = buildProviderInsert(input);

    expect(payload.priority).toBe("highest");
  });

  it("defaults is_gap_filler to false when not provided", () => {
    const input = makeInput();
    const payload = buildProviderInsert(input);

    expect(payload.is_gap_filler).toBe(false);
  });

  it("maps isGapFiller true to is_gap_filler true", () => {
    const input = makeInput({ isGapFiller: true });
    const payload = buildProviderInsert(input);

    expect(payload.is_gap_filler).toBe(true);
  });

  it("maps providerId to provider_id snake_case key", () => {
    const input = makeInput({ providerId: "prov-catalog-uuid-042" });
    const payload = buildProviderInsert(input);

    expect(payload.provider_id).toBe("prov-catalog-uuid-042");
  });

  it("defaults missing optional fields to null", () => {
    const input = makeInput();
    const payload = buildProviderInsert(input);

    expect(payload.provider_id).toBeNull();
    expect(payload.agent_note).toBeNull();
  });

  it("maps agentNote to agent_note snake_case key", () => {
    const input = makeInput({ agentNote: "Bilingual staff — ideal for Chen family" });
    const payload = buildProviderInsert(input);

    expect(payload.agent_note).toBe("Bilingual staff — ideal for Chen family");
  });
});
