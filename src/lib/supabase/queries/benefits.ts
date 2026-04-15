import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BenefitStatus =
  | "not_started"
  | "pending"
  | "approved"
  | "denied"
  | "active"
  | "renewed"
  | "unknown";

/** Raw DB row — snake_case, matches family_benefits schema */
export interface BenefitRow {
  id: string;
  family_id: string;
  agent_id: string;
  benefit_name: string;
  status: BenefitStatus;
  applied_date: string | null;
  approved_date: string | null;
  renewal_date: string | null;
  amount: string | null;
  eligibility_detail: string | null;
  action: string | null;
  documents_needed: string | null;
  agent_note: string | null;
  created_at: string;
  updated_at: string;
}

/** camelCase frontend model */
export interface FamilyBenefit {
  id: string;
  familyId: string;
  agentId: string;
  benefitName: string;
  status: BenefitStatus;
  appliedDate: string | null;
  approvedDate: string | null;
  renewalDate: string | null;
  amount: string | null;
  eligibilityDetail: string | null;
  action: string | null;
  documentsNeeded: string | null;
  agentNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new benefit row */
export interface InsertBenefitInput {
  familyId: string;
  agentId: string;
  benefitName: string;
  status?: BenefitStatus;
  appliedDate?: string;
  approvedDate?: string;
  renewalDate?: string;
  amount?: string;
  eligibilityDetail?: string;
  action?: string;
  documentsNeeded?: string;
  agentNote?: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/** Maps a raw BenefitRow to the camelCase FamilyBenefit frontend model */
export function mapBenefitRow(row: BenefitRow): FamilyBenefit {
  return {
    id: row.id,
    familyId: row.family_id,
    agentId: row.agent_id,
    benefitName: row.benefit_name,
    status: row.status,
    appliedDate: row.applied_date,
    approvedDate: row.approved_date,
    renewalDate: row.renewal_date,
    amount: row.amount,
    eligibilityDetail: row.eligibility_detail,
    action: row.action,
    documentsNeeded: row.documents_needed,
    agentNote: row.agent_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Builds a DB insert payload from InsertBenefitInput, applying defaults */
export function buildBenefitInsert(
  input: InsertBenefitInput
): Record<string, unknown> {
  return {
    family_id: input.familyId,
    agent_id: input.agentId,
    benefit_name: input.benefitName,
    status: input.status ?? "not_started",
    applied_date: input.appliedDate ?? null,
    approved_date: input.approvedDate ?? null,
    renewal_date: input.renewalDate ?? null,
    amount: input.amount ?? null,
    eligibility_detail: input.eligibilityDetail ?? null,
    action: input.action ?? null,
    documents_needed: input.documentsNeeded ?? null,
    agent_note: input.agentNote ?? null,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch benefits for a family, optionally filtered by agent.
 * Returns mapped FamilyBenefit array, ordered by created_at ascending.
 */
export async function getBenefits(
  supabase: SupabaseClient,
  familyId: string,
  agentId?: string
): Promise<FamilyBenefit[]> {
  let query = supabase
    .from("family_benefits")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch benefits: ${error.message}`);
  }

  return (data as BenefitRow[]).map(mapBenefitRow);
}

/**
 * Insert a new benefit row and return the mapped record.
 */
export async function insertBenefit(
  supabase: SupabaseClient,
  input: InsertBenefitInput
): Promise<FamilyBenefit> {
  const payload = buildBenefitInsert(input);

  const { data, error } = await supabase
    .from("family_benefits")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert benefit: ${error.message}`);
  }

  return mapBenefitRow(data as BenefitRow);
}

/**
 * Update the status (and optional date fields) of an existing benefit.
 */
export async function updateBenefitStatus(
  supabase: SupabaseClient,
  benefitId: string,
  status: BenefitStatus | string,
  dates?: {
    applied?: string;
    approved?: string;
    renewal?: string;
  }
): Promise<void> {
  const updates: Record<string, unknown> = { status };

  if (dates?.applied !== undefined) updates.applied_date = dates.applied;
  if (dates?.approved !== undefined) updates.approved_date = dates.approved;
  if (dates?.renewal !== undefined) updates.renewal_date = dates.renewal;

  const { error } = await supabase
    .from("family_benefits")
    .update(updates)
    .eq("id", benefitId);

  if (error) {
    throw new Error(`Failed to update benefit status: ${error.message}`);
  }
}
