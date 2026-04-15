import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderPriority = "highest" | "relevant" | "other";

export type ProviderStatus =
  | "recommended"
  | "contacted"
  | "waitlisted"
  | "active"
  | "declined";

/** Raw DB row — snake_case, mirrors family_providers table */
export interface ProviderRow {
  id: string;
  family_id: string;
  provider_id: string | null;
  agent_id: string;
  provider_name: string;
  priority: string;
  status: string;
  agent_note: string | null;
  is_gap_filler: boolean | null;
  created_at: string;
  updated_at: string;
}

/** camelCase frontend model */
export interface FamilyProvider {
  id: string;
  familyId: string;
  providerId: string | null;
  agentId: string;
  providerName: string;
  priority: ProviderPriority;
  status: ProviderStatus;
  agentNote: string | null;
  isGapFiller: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new family_providers row */
export interface InsertProviderInput {
  familyId: string;
  agentId: string;
  providerName: string;
  providerId?: string;
  priority?: ProviderPriority;
  status?: ProviderStatus;
  agentNote?: string;
  isGapFiller?: boolean;
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/** Maps a raw ProviderRow to the camelCase FamilyProvider frontend model */
export function mapProviderRow(row: ProviderRow): FamilyProvider {
  return {
    id: row.id,
    familyId: row.family_id,
    providerId: row.provider_id,
    agentId: row.agent_id,
    providerName: row.provider_name,
    priority: row.priority as ProviderPriority,
    status: row.status as ProviderStatus,
    agentNote: row.agent_note,
    isGapFiller: row.is_gap_filler ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Insert payload builder
// ---------------------------------------------------------------------------

/** Builds a DB insert payload from InsertProviderInput, applying defaults */
export function buildProviderInsert(
  input: InsertProviderInput
): Record<string, unknown> {
  return {
    family_id: input.familyId,
    provider_id: input.providerId ?? null,
    agent_id: input.agentId,
    provider_name: input.providerName,
    priority: input.priority ?? "relevant",
    status: input.status ?? "recommended",
    agent_note: input.agentNote ?? null,
    is_gap_filler: input.isGapFiller ?? false,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch providers for a family, optionally filtered by agent.
 * Returns mapped FamilyProvider array, ordered by created_at ascending.
 */
export async function getFamilyProviders(
  supabase: SupabaseClient,
  familyId: string,
  agentId?: string
): Promise<FamilyProvider[]> {
  let query = supabase
    .from("family_providers")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`getFamilyProviders: ${error.message}`);
  }

  return (data as ProviderRow[]).map(mapProviderRow);
}

/**
 * Insert a new family_providers row and return the mapped record.
 */
export async function addFamilyProvider(
  supabase: SupabaseClient,
  input: InsertProviderInput
): Promise<FamilyProvider> {
  const payload = buildProviderInsert(input);

  const { data, error } = await supabase
    .from("family_providers")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`addFamilyProvider: ${error.message}`);
  }

  return mapProviderRow(data as ProviderRow);
}

/**
 * Update the status of an existing family provider entry.
 */
export async function updateProviderStatus(
  supabase: SupabaseClient,
  id: string,
  status: ProviderStatus | string
): Promise<void> {
  const { error } = await supabase
    .from("family_providers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`updateProviderStatus: ${error.message}`);
  }
}
