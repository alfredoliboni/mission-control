import type { SupabaseClient } from "@supabase/supabase-js";

// ─── DB Row Type (snake_case) ─────────────────────────────────────────────────

export interface TeamMemberRow {
  id: string;
  family_id: string;
  agent_id: string;
  child_name: string | null;
  name: string;
  role: string;
  organization: string | null;
  services: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: "active" | "former" | "pending" | "declined";
  stakeholder_user_id: string | null;
  permissions: Record<string, unknown>;
  invite_token: string | null;
  started_at: string | null;
  removed_at: string | null;
  removed_reason: string | null;
  source: string | null;
  agent_note: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Frontend Type (camelCase) ────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  familyId: string;
  agentId: string;
  childName: string | null;
  name: string;
  role: string;
  organization: string | null;
  services: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: "active" | "former" | "pending" | "declined";
  /** true when status === 'active' */
  active: boolean;
  stakeholderUserId: string | null;
  permissions: Record<string, unknown>;
  inviteToken: string | null;
  startedAt: string | null;
  removedAt: string | null;
  removedReason: string | null;
  source: string | null;
  agentNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Insert Input ─────────────────────────────────────────────────────────────

export interface InsertMemberInput {
  familyId: string;
  agentId: string;
  childName?: string;
  name: string;
  role: string;
  organization?: string;
  services?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: "active" | "former" | "pending" | "declined";
  stakeholderUserId?: string | null;
  permissions?: Record<string, unknown>;
  inviteToken?: string;
  startedAt?: string;
  source?: string;
  agentNote?: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

/**
 * Maps a DB row (snake_case) to the frontend TeamMember type (camelCase).
 * Empty strings for optional text fields are normalized to null.
 */
export function mapTeamMemberRow(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    familyId: row.family_id,
    agentId: row.agent_id,
    childName: normalizeOptional(row.child_name),
    name: row.name,
    role: row.role,
    organization: normalizeOptional(row.organization),
    services: normalizeOptional(row.services),
    phone: normalizeOptional(row.phone),
    email: normalizeOptional(row.email),
    website: normalizeOptional(row.website),
    status: row.status,
    active: row.status === "active",
    stakeholderUserId: row.stakeholder_user_id ?? null,
    permissions: row.permissions ?? {},
    inviteToken: normalizeOptional(row.invite_token),
    startedAt: normalizeOptional(row.started_at),
    removedAt: normalizeOptional(row.removed_at),
    removedReason: normalizeOptional(row.removed_reason),
    source: normalizeOptional(row.source),
    agentNote: normalizeOptional(row.agent_note),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Builds an insert payload for the `family_team_members` table.
 * Sets started_at to today if not provided.
 */
export function buildMemberInsert(
  input: InsertMemberInput
): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return {
    family_id: input.familyId,
    agent_id: input.agentId,
    child_name: normalizeOptional(input.childName ?? null),
    name: input.name,
    role: input.role,
    organization: normalizeOptional(input.organization ?? null),
    services: normalizeOptional(input.services ?? null),
    phone: normalizeOptional(input.phone ?? null),
    email: normalizeOptional(input.email ?? null),
    website: normalizeOptional(input.website ?? null),
    status: input.status ?? "active",
    stakeholder_user_id: input.stakeholderUserId ?? null,
    permissions: input.permissions ?? {},
    invite_token: normalizeOptional(input.inviteToken ?? null),
    started_at: input.startedAt ?? today,
    source: normalizeOptional(input.source ?? null),
    agent_note: normalizeOptional(input.agentNote ?? null),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all team members for a family, optionally filtered by agentId.
 * Returns them split into active and former buckets.
 */
export async function getTeamMembers(
  supabase: SupabaseClient,
  familyId: string,
  agentId?: string
): Promise<{ active: TeamMember[]; former: TeamMember[] }> {
  let query = supabase
    .from("family_team_members")
    .select("*")
    .eq("family_id", familyId)
    .order("started_at", { ascending: false });

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`getTeamMembers: ${error.message}`);

  const rows = (data ?? []) as TeamMemberRow[];
  const members = rows.map(mapTeamMemberRow);

  return {
    active: members.filter((m) => m.status === "active"),
    former: members.filter((m) => m.status === "former"),
  };
}

/**
 * Inserts a new team member and returns the mapped record.
 */
export async function addTeamMember(
  supabase: SupabaseClient,
  input: InsertMemberInput
): Promise<TeamMember> {
  const payload = buildMemberInsert(input);

  const { data, error } = await supabase
    .from("family_team_members")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`addTeamMember: ${error.message}`);

  return mapTeamMemberRow(data as TeamMemberRow);
}

/**
 * Marks a team member as 'former' with a removed_at timestamp and reason.
 */
export async function removeTeamMember(
  supabase: SupabaseClient,
  memberId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("family_team_members")
    .update({
      status: "former",
      removed_at: new Date().toISOString().slice(0, 10),
      removed_reason: reason,
    })
    .eq("id", memberId);

  if (error) throw new Error(`removeTeamMember: ${error.message}`);
}

/**
 * Updates contact fields (phone, email, website) for a team member.
 */
export async function updateMemberContact(
  supabase: SupabaseClient,
  memberId: string,
  fields: Partial<{ phone: string; email: string; website: string }>
): Promise<void> {
  const update: Record<string, string | null> = {};
  if ("phone" in fields) update.phone = normalizeOptional(fields.phone ?? null);
  if ("email" in fields) update.email = normalizeOptional(fields.email ?? null);
  if ("website" in fields)
    update.website = normalizeOptional(fields.website ?? null);

  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from("family_team_members")
    .update(update)
    .eq("id", memberId);

  if (error) throw new Error(`updateMemberContact: ${error.message}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converts empty strings and undefined to null; otherwise passes through. */
function normalizeOptional(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  return value;
}
