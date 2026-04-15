import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  mapTeamMemberRow,
  buildMemberInsert,
  type TeamMemberRow,
  type InsertMemberInput,
} from "./team-members";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeRow(overrides: Partial<TeamMemberRow> = {}): TeamMemberRow {
  return {
    id: "row-uuid-1",
    family_id: "family-uuid-1",
    agent_id: "agent-santos",
    child_name: "Alex",
    name: "Dr. Sarah Kim",
    role: "Occupational Therapist",
    organization: "KidsOT Clinic",
    services: "Sensory integration, fine motor",
    phone: "519-555-0100",
    email: "sarah@kidsot.ca",
    website: "https://kidsot.ca",
    status: "active",
    stakeholder_user_id: null,
    permissions: {},
    invite_token: null,
    started_at: "2024-03-01",
    removed_at: null,
    removed_reason: null,
    source: "agent",
    agent_note: "Highly recommended by navigator",
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-01T10:00:00Z",
    ...overrides,
  };
}

// ─── Test 1: Maps active member correctly (active === true) ───────────────────

describe("mapTeamMemberRow", () => {
  it("maps an active member row to camelCase with active=true", () => {
    const row = makeRow({ status: "active" });
    const member = mapTeamMemberRow(row);

    expect(member.id).toBe("row-uuid-1");
    expect(member.familyId).toBe("family-uuid-1");
    expect(member.agentId).toBe("agent-santos");
    expect(member.childName).toBe("Alex");
    expect(member.name).toBe("Dr. Sarah Kim");
    expect(member.role).toBe("Occupational Therapist");
    expect(member.organization).toBe("KidsOT Clinic");
    expect(member.services).toBe("Sensory integration, fine motor");
    expect(member.phone).toBe("519-555-0100");
    expect(member.email).toBe("sarah@kidsot.ca");
    expect(member.website).toBe("https://kidsot.ca");
    expect(member.status).toBe("active");
    expect(member.active).toBe(true);
    expect(member.startedAt).toBe("2024-03-01");
    expect(member.removedAt).toBeNull();
    expect(member.removedReason).toBeNull();
    expect(member.agentNote).toBe("Highly recommended by navigator");
    expect(member.createdAt).toBe("2024-03-01T10:00:00Z");
  });

  // ─── Test 2: Maps former member correctly (active=false, removedReason) ───

  it("maps a former member with active=false and removedReason populated", () => {
    const row = makeRow({
      status: "former",
      removed_at: "2025-01-15",
      removed_reason: "Family moved to a different provider",
    });
    const member = mapTeamMemberRow(row);

    expect(member.status).toBe("former");
    expect(member.active).toBe(false);
    expect(member.removedAt).toBe("2025-01-15");
    expect(member.removedReason).toBe("Family moved to a different provider");
  });

  // ─── Test 4: Handles nullable stakeholder_user_id ─────────────────────────

  it("handles null stakeholder_user_id", () => {
    const row = makeRow({ stakeholder_user_id: null });
    const member = mapTeamMemberRow(row);

    expect(member.stakeholderUserId).toBeNull();
  });

  it("passes through a non-null stakeholder_user_id", () => {
    const userId = "user-uuid-abc";
    const row = makeRow({ stakeholder_user_id: userId });
    const member = mapTeamMemberRow(row);

    expect(member.stakeholderUserId).toBe(userId);
  });

  // ─── Test 5: Normalizes empty strings for optional fields ─────────────────

  it("normalizes empty strings in optional fields to null", () => {
    const row = makeRow({
      organization: "",
      services: "  ",
      phone: "",
      email: "",
      website: "",
      child_name: "",
      agent_note: "",
      source: "  ",
      invite_token: "",
    });
    const member = mapTeamMemberRow(row);

    expect(member.organization).toBeNull();
    expect(member.services).toBeNull();
    expect(member.phone).toBeNull();
    expect(member.email).toBeNull();
    expect(member.website).toBeNull();
    expect(member.childName).toBeNull();
    expect(member.agentNote).toBeNull();
    expect(member.source).toBeNull();
    expect(member.inviteToken).toBeNull();
  });
});

// ─── Test 3: buildMemberInsert — today's started_at ──────────────────────────

describe("buildMemberInsert", () => {
  const TODAY_RE = /^\d{4}-\d{2}-\d{2}$/;

  it("sets started_at to today when not provided", () => {
    const input: InsertMemberInput = {
      familyId: "family-1",
      agentId: "agent-1",
      name: "Dr. Jones",
      role: "Pediatrician",
    };
    const payload = buildMemberInsert(input);

    expect(typeof payload.started_at).toBe("string");
    expect(payload.started_at).toMatch(TODAY_RE);

    // Verify it is actually today's date
    const today = new Date().toISOString().slice(0, 10);
    expect(payload.started_at).toBe(today);
  });

  it("uses provided started_at when supplied", () => {
    const input: InsertMemberInput = {
      familyId: "family-1",
      agentId: "agent-1",
      name: "Dr. Jones",
      role: "Pediatrician",
      startedAt: "2023-09-01",
    };
    const payload = buildMemberInsert(input);

    expect(payload.started_at).toBe("2023-09-01");
  });

  it("maps camelCase input keys to snake_case payload keys", () => {
    const input: InsertMemberInput = {
      familyId: "fam-uuid",
      agentId: "agent-uuid",
      childName: "Sofia",
      name: "Ms. Patel",
      role: "Teacher",
      organization: "Westwood Elementary",
      stakeholderUserId: "user-xyz",
    };
    const payload = buildMemberInsert(input);

    expect(payload.family_id).toBe("fam-uuid");
    expect(payload.agent_id).toBe("agent-uuid");
    expect(payload.child_name).toBe("Sofia");
    expect(payload.name).toBe("Ms. Patel");
    expect(payload.role).toBe("Teacher");
    expect(payload.organization).toBe("Westwood Elementary");
    expect(payload.stakeholder_user_id).toBe("user-xyz");
  });

  it("defaults status to 'active' when not provided", () => {
    const input: InsertMemberInput = {
      familyId: "f1",
      agentId: "a1",
      name: "Test",
      role: "Role",
    };
    expect(buildMemberInsert(input).status).toBe("active");
  });

  it("normalizes empty optional strings to null in insert payload", () => {
    const input: InsertMemberInput = {
      familyId: "f1",
      agentId: "a1",
      name: "Test",
      role: "Role",
      phone: "",
      email: "  ",
      website: "",
      organization: "",
    };
    const payload = buildMemberInsert(input);

    expect(payload.phone).toBeNull();
    expect(payload.email).toBeNull();
    expect(payload.website).toBeNull();
    expect(payload.organization).toBeNull();
  });

  it("defaults permissions to empty object when not provided", () => {
    const input: InsertMemberInput = {
      familyId: "f1",
      agentId: "a1",
      name: "Test",
      role: "Role",
    };
    expect(buildMemberInsert(input).permissions).toEqual({});
  });
});
