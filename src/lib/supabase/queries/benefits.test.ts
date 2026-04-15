import { describe, it, expect } from "vitest";
import {
  mapBenefitRow,
  buildBenefitInsert,
  type BenefitRow,
  type InsertBenefitInput,
} from "./benefits";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<BenefitRow> = {}): BenefitRow {
  return {
    id: "row-uuid-001",
    family_id: "family-uuid-001",
    agent_id: "navigator-santos",
    benefit_name: "Ontario Autism Program (OAP)",
    status: "pending",
    applied_date: "2025-01-15",
    approved_date: null,
    renewal_date: null,
    amount: "$2,400/year",
    eligibility_detail: "Child diagnosed ASD, age 0-18",
    action: "Submit OAP registration form",
    documents_needed: "Diagnosis letter, health card",
    agent_note: "Priority — apply immediately",
    created_at: "2025-01-10T12:00:00Z",
    updated_at: "2025-01-10T12:00:00Z",
    ...overrides,
  };
}

function makeInput(overrides: Partial<InsertBenefitInput> = {}): InsertBenefitInput {
  return {
    familyId: "family-uuid-001",
    agentId: "navigator-santos",
    benefitName: "Ontario Autism Program (OAP)",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapBenefitRow
// ---------------------------------------------------------------------------

describe("mapBenefitRow", () => {
  it("maps all snake_case DB columns to camelCase frontend fields", () => {
    const row = makeRow();
    const result = mapBenefitRow(row);

    expect(result.id).toBe("row-uuid-001");
    expect(result.familyId).toBe("family-uuid-001");
    expect(result.agentId).toBe("navigator-santos");
    expect(result.benefitName).toBe("Ontario Autism Program (OAP)");
    expect(result.status).toBe("pending");
    expect(result.appliedDate).toBe("2025-01-15");
    expect(result.approvedDate).toBeNull();
    expect(result.renewalDate).toBeNull();
    expect(result.amount).toBe("$2,400/year");
    expect(result.createdAt).toBe("2025-01-10T12:00:00Z");
    expect(result.updatedAt).toBe("2025-01-10T12:00:00Z");
  });

  it("maps eligibility_detail and action correctly", () => {
    const row = makeRow({
      eligibility_detail: "Must be under 18 with ASD diagnosis",
      action: "Submit OAP registration form to MCCSS",
    });
    const result = mapBenefitRow(row);

    expect(result.eligibilityDetail).toBe("Must be under 18 with ASD diagnosis");
    expect(result.action).toBe("Submit OAP registration form to MCCSS");
  });

  it("maps null optional fields as null (not undefined)", () => {
    const row = makeRow({
      applied_date: null,
      approved_date: null,
      renewal_date: null,
      amount: null,
      eligibility_detail: null,
      action: null,
      documents_needed: null,
      agent_note: null,
    });
    const result = mapBenefitRow(row);

    expect(result.appliedDate).toBeNull();
    expect(result.approvedDate).toBeNull();
    expect(result.renewalDate).toBeNull();
    expect(result.amount).toBeNull();
    expect(result.eligibilityDetail).toBeNull();
    expect(result.action).toBeNull();
    expect(result.documentsNeeded).toBeNull();
    expect(result.agentNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildBenefitInsert
// ---------------------------------------------------------------------------

describe("buildBenefitInsert", () => {
  it("builds insert payload with required fields and snake_case keys", () => {
    const input = makeInput();
    const payload = buildBenefitInsert(input);

    expect(payload.family_id).toBe("family-uuid-001");
    expect(payload.agent_id).toBe("navigator-santos");
    expect(payload.benefit_name).toBe("Ontario Autism Program (OAP)");
  });

  it("defaults status to not_started when not provided", () => {
    const input = makeInput(); // no status field
    const payload = buildBenefitInsert(input);

    expect(payload.status).toBe("not_started");
  });

  it("uses provided status when supplied", () => {
    const input = makeInput({ status: "active" });
    const payload = buildBenefitInsert(input);

    expect(payload.status).toBe("active");
  });

  it("handles date fields — applied, approved, renewal — mapping to snake_case", () => {
    const input = makeInput({
      appliedDate: "2025-02-01",
      approvedDate: "2025-03-15",
      renewalDate: "2026-03-15",
    });
    const payload = buildBenefitInsert(input);

    expect(payload.applied_date).toBe("2025-02-01");
    expect(payload.approved_date).toBe("2025-03-15");
    expect(payload.renewal_date).toBe("2026-03-15");
  });

  it("defaults missing date fields to null", () => {
    const input = makeInput(); // no dates
    const payload = buildBenefitInsert(input);

    expect(payload.applied_date).toBeNull();
    expect(payload.approved_date).toBeNull();
    expect(payload.renewal_date).toBeNull();
  });

  it("maps eligibilityDetail and action to snake_case keys with null defaults", () => {
    const input = makeInput({
      eligibilityDetail: "Child diagnosed ASD, under 18",
      action: "Apply via MCCSS portal",
    });
    const payload = buildBenefitInsert(input);

    expect(payload.eligibility_detail).toBe("Child diagnosed ASD, under 18");
    expect(payload.action).toBe("Apply via MCCSS portal");
  });

  it("defaults optional text fields to null when not provided", () => {
    const input = makeInput();
    const payload = buildBenefitInsert(input);

    expect(payload.amount).toBeNull();
    expect(payload.eligibility_detail).toBeNull();
    expect(payload.action).toBeNull();
    expect(payload.documents_needed).toBeNull();
    expect(payload.agent_note).toBeNull();
  });
});
