import { describe, it, expect } from "vitest";
import {
  mapProgramRow,
  buildProgramInsert,
  type ProgramRow,
  type InsertProgramInput,
} from "./family-programs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<ProgramRow> = {}): ProgramRow {
  return {
    id: "prog-row-uuid-001",
    family_id: "family-uuid-001",
    program_id: null,
    agent_id: "navigator-santos",
    program_name: "ABA Therapy — Kerry's Place",
    status: "recommended",
    agent_note: "High priority — wait list can be 12 months",
    is_gap_filler: false,
    enrolled_at: null,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
    ...overrides,
  };
}

function makeInput(overrides: Partial<InsertProgramInput> = {}): InsertProgramInput {
  return {
    familyId: "family-uuid-001",
    agentId: "navigator-santos",
    programName: "ABA Therapy — Kerry's Place",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapProgramRow
// ---------------------------------------------------------------------------

describe("mapProgramRow", () => {
  it("maps all snake_case DB columns to camelCase frontend fields", () => {
    const row = makeRow();
    const result = mapProgramRow(row);

    expect(result.id).toBe("prog-row-uuid-001");
    expect(result.familyId).toBe("family-uuid-001");
    expect(result.programId).toBeNull();
    expect(result.agentId).toBe("navigator-santos");
    expect(result.programName).toBe("ABA Therapy — Kerry's Place");
    expect(result.status).toBe("recommended");
    expect(result.agentNote).toBe("High priority — wait list can be 12 months");
    expect(result.isGapFiller).toBe(false);
    expect(result.enrolledAt).toBeNull();
    expect(result.createdAt).toBe("2026-04-01T10:00:00Z");
    expect(result.updatedAt).toBe("2026-04-01T10:00:00Z");
  });

  it("maps program_id when present", () => {
    const row = makeRow({ program_id: "prog-catalog-uuid-007" });
    const result = mapProgramRow(row);

    expect(result.programId).toBe("prog-catalog-uuid-007");
  });

  it("defaults is_gap_filler null to false", () => {
    const row = makeRow({ is_gap_filler: null });
    const result = mapProgramRow(row);

    expect(result.isGapFiller).toBe(false);
  });

  it("preserves is_gap_filler true correctly", () => {
    const row = makeRow({ is_gap_filler: true });
    const result = mapProgramRow(row);

    expect(result.isGapFiller).toBe(true);
  });

  it("maps enrolled status with enrolled_at date", () => {
    const row = makeRow({
      status: "enrolled",
      enrolled_at: "2026-03-15",
    });
    const result = mapProgramRow(row);

    expect(result.status).toBe("enrolled");
    expect(result.enrolledAt).toBe("2026-03-15");
  });

  it("maps null agent_note as null", () => {
    const row = makeRow({ agent_note: null });
    const result = mapProgramRow(row);

    expect(result.agentNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildProgramInsert
// ---------------------------------------------------------------------------

describe("buildProgramInsert", () => {
  it("builds insert payload with required fields and snake_case keys", () => {
    const input = makeInput();
    const payload = buildProgramInsert(input);

    expect(payload.family_id).toBe("family-uuid-001");
    expect(payload.agent_id).toBe("navigator-santos");
    expect(payload.program_name).toBe("ABA Therapy — Kerry's Place");
  });

  it("defaults status to recommended when not provided", () => {
    const input = makeInput();
    const payload = buildProgramInsert(input);

    expect(payload.status).toBe("recommended");
  });

  it("uses provided status when supplied", () => {
    const input = makeInput({ status: "enrolled" });
    const payload = buildProgramInsert(input);

    expect(payload.status).toBe("enrolled");
  });

  it("defaults is_gap_filler to false when not provided", () => {
    const input = makeInput();
    const payload = buildProgramInsert(input);

    expect(payload.is_gap_filler).toBe(false);
  });

  it("maps isGapFiller true to is_gap_filler true", () => {
    const input = makeInput({ isGapFiller: true });
    const payload = buildProgramInsert(input);

    expect(payload.is_gap_filler).toBe(true);
  });

  it("maps programId to program_id snake_case key", () => {
    const input = makeInput({ programId: "prog-catalog-uuid-007" });
    const payload = buildProgramInsert(input);

    expect(payload.program_id).toBe("prog-catalog-uuid-007");
  });

  it("defaults missing optional fields to null", () => {
    const input = makeInput();
    const payload = buildProgramInsert(input);

    expect(payload.program_id).toBeNull();
    expect(payload.agent_note).toBeNull();
    expect(payload.enrolled_at).toBeNull();
  });

  it("maps enrolledAt to enrolled_at snake_case key", () => {
    const input = makeInput({ enrolledAt: "2026-03-15" });
    const payload = buildProgramInsert(input);

    expect(payload.enrolled_at).toBe("2026-03-15");
  });

  it("maps agentNote to agent_note snake_case key", () => {
    const input = makeInput({ agentNote: "Apply immediately — spots filling fast" });
    const payload = buildProgramInsert(input);

    expect(payload.agent_note).toBe("Apply immediately — spots filling fast");
  });
});
