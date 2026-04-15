import { describe, it, expect } from "vitest";
import { mapAlertRowToAlert, buildInsertPayload } from "./alerts";
import type { AlertRow, InsertAlertInput } from "./alerts";

// ── mapAlertRowToAlert ────────────────────────────────────────────────────

describe("mapAlertRowToAlert", () => {
  const baseRow: AlertRow = {
    id: "00000000-0000-0000-0000-000000000001",
    family_id: "00000000-0000-0000-0000-000000000002",
    agent_id: "navigator-santos",
    child_name: "Alex Santos",
    date: "2026-04-01",
    severity: "HIGH",
    title: "Melatonin Dose Review Required",
    description: "Melatonin 3mg nightly has been at current dose for 6 months.",
    action: "Review with Dr. Patel at next appointment",
    status: "active",
    completed_at: null,
    notes: null,
    source: "workspace",
    related_entity_type: null,
    related_entity_id: null,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  };

  it("maps a DB row to FamilyAlert correctly", () => {
    const alert = mapAlertRowToAlert(baseRow);

    expect(alert.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(alert.familyId).toBe("00000000-0000-0000-0000-000000000002");
    expect(alert.agentId).toBe("navigator-santos");
    expect(alert.childName).toBe("Alex Santos");
    expect(alert.date).toBe("2026-04-01");
    expect(alert.severity).toBe("HIGH");
    expect(alert.title).toBe("Melatonin Dose Review Required");
    expect(alert.description).toBe("Melatonin 3mg nightly has been at current dose for 6 months.");
    expect(alert.action).toBe("Review with Dr. Patel at next appointment");
    expect(alert.status).toBe("active");
    expect(alert.completedAt).toBeNull();
    expect(alert.notes).toEqual([]);
    expect(alert.source).toBe("workspace");
    expect(alert.relatedEntityType).toBeNull();
    expect(alert.relatedEntityId).toBeNull();
    expect(alert.createdAt).toBe("2026-04-01T10:00:00Z");
    expect(alert.updatedAt).toBe("2026-04-01T10:00:00Z");
  });

  it("maps notes array correctly when notes are present", () => {
    const rowWithNotes: AlertRow = {
      ...baseRow,
      notes: ["Checked with pharmacy", "Follow-up scheduled for May"],
    };

    const alert = mapAlertRowToAlert(rowWithNotes);
    expect(alert.notes).toEqual(["Checked with pharmacy", "Follow-up scheduled for May"]);
    expect(alert.notes).toHaveLength(2);
  });

  it("maps null notes to empty array", () => {
    const rowWithNullNotes: AlertRow = { ...baseRow, notes: null };
    const alert = mapAlertRowToAlert(rowWithNullNotes);
    expect(alert.notes).toEqual([]);
  });

  it("maps status 'completed' with completedAt correctly", () => {
    const completedRow: AlertRow = {
      ...baseRow,
      status: "completed",
      completed_at: "2026-04-10T14:30:00Z",
    };

    const alert = mapAlertRowToAlert(completedRow);
    expect(alert.status).toBe("completed");
    expect(alert.completedAt).toBe("2026-04-10T14:30:00Z");
  });

  it("maps status 'dismissed' correctly", () => {
    const dismissedRow: AlertRow = {
      ...baseRow,
      status: "dismissed",
      completed_at: null,
    };

    const alert = mapAlertRowToAlert(dismissedRow);
    expect(alert.status).toBe("dismissed");
    expect(alert.completedAt).toBeNull();
  });

  it("maps MEDIUM severity correctly", () => {
    const mediumRow: AlertRow = { ...baseRow, severity: "MEDIUM" };
    const alert = mapAlertRowToAlert(mediumRow);
    expect(alert.severity).toBe("MEDIUM");
  });

  it("maps INFO severity correctly", () => {
    const infoRow: AlertRow = { ...baseRow, severity: "INFO" };
    const alert = mapAlertRowToAlert(infoRow);
    expect(alert.severity).toBe("INFO");
  });
});

// ── buildInsertPayload ────────────────────────────────────────────────────

describe("buildInsertPayload", () => {
  const baseInput: InsertAlertInput = {
    familyId: "00000000-0000-0000-0000-000000000002",
    agentId: "navigator-santos",
    childName: "Alex Santos",
    date: "2026-04-01",
    severity: "HIGH",
    title: "Melatonin Dose Review Required",
    description: "Melatonin 3mg nightly has been at current dose for 6 months.",
    action: "Review with Dr. Patel at next appointment",
  };

  it("builds insert payload with defaults", () => {
    const payload = buildInsertPayload(baseInput);

    expect(payload.family_id).toBe("00000000-0000-0000-0000-000000000002");
    expect(payload.agent_id).toBe("navigator-santos");
    expect(payload.child_name).toBe("Alex Santos");
    expect(payload.date).toBe("2026-04-01");
    expect(payload.severity).toBe("HIGH");
    expect(payload.title).toBe("Melatonin Dose Review Required");
    expect(payload.description).toBe("Melatonin 3mg nightly has been at current dose for 6 months.");
    expect(payload.action).toBe("Review with Dr. Patel at next appointment");
    // defaults
    expect(payload.status).toBe("active");
    expect(payload.notes).toEqual([]);
  });

  it("defaults severity to INFO when not provided", () => {
    const inputWithoutSeverity: InsertAlertInput = {
      familyId: "00000000-0000-0000-0000-000000000002",
      agentId: "navigator-santos",
      childName: "Alex Santos",
      date: "2026-04-15",
      title: "Upcoming Assessment Reminder",
      description: "Assessment scheduled for next month.",
      action: "Confirm appointment",
    };

    const payload = buildInsertPayload(inputWithoutSeverity);
    expect(payload.severity).toBe("INFO");
  });

  it("uses provided status when explicitly set", () => {
    const input: InsertAlertInput = { ...baseInput, status: "dismissed" };
    const payload = buildInsertPayload(input);
    expect(payload.status).toBe("dismissed");
  });

  it("includes source when provided", () => {
    const input: InsertAlertInput = { ...baseInput, source: "agent-heartbeat" };
    const payload = buildInsertPayload(input);
    expect(payload.source).toBe("agent-heartbeat");
  });

  it("includes notes when provided", () => {
    const input: InsertAlertInput = {
      ...baseInput,
      notes: ["Initial note", "Follow-up note"],
    };
    const payload = buildInsertPayload(input);
    expect(payload.notes).toEqual(["Initial note", "Follow-up note"]);
  });

  it("sets notes to empty array by default", () => {
    const payload = buildInsertPayload(baseInput);
    expect(payload.notes).toEqual([]);
  });

  it("includes relatedEntityType and relatedEntityId when provided", () => {
    const input: InsertAlertInput = {
      ...baseInput,
      relatedEntityType: "provider",
      relatedEntityId: "00000000-0000-0000-0000-000000000099",
    };
    const payload = buildInsertPayload(input);
    expect(payload.related_entity_type).toBe("provider");
    expect(payload.related_entity_id).toBe("00000000-0000-0000-0000-000000000099");
  });
});
