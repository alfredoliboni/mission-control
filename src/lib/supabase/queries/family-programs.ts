import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgramStatus =
  | "recommended"
  | "applied"
  | "enrolled"
  | "completed"
  | "dropped";

/** Raw DB row — snake_case, mirrors family_programs table */
export interface ProgramRow {
  id: string;
  family_id: string;
  program_id: string | null;
  agent_id: string;
  program_name: string;
  status: string;
  agent_note: string | null;
  is_gap_filler: boolean | null;
  enrolled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** camelCase frontend model */
export interface FamilyProgram {
  id: string;
  familyId: string;
  programId: string | null;
  agentId: string;
  programName: string;
  status: ProgramStatus;
  agentNote: string | null;
  isGapFiller: boolean;
  enrolledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new family_programs row */
export interface InsertProgramInput {
  familyId: string;
  agentId: string;
  programName: string;
  programId?: string;
  status?: ProgramStatus;
  agentNote?: string;
  isGapFiller?: boolean;
  enrolledAt?: string;
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/** Maps a raw ProgramRow to the camelCase FamilyProgram frontend model */
export function mapProgramRow(row: ProgramRow): FamilyProgram {
  return {
    id: row.id,
    familyId: row.family_id,
    programId: row.program_id,
    agentId: row.agent_id,
    programName: row.program_name,
    status: row.status as ProgramStatus,
    agentNote: row.agent_note,
    isGapFiller: row.is_gap_filler ?? false,
    enrolledAt: row.enrolled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Insert payload builder
// ---------------------------------------------------------------------------

/** Builds a DB insert payload from InsertProgramInput, applying defaults */
export function buildProgramInsert(
  input: InsertProgramInput
): Record<string, unknown> {
  return {
    family_id: input.familyId,
    program_id: input.programId ?? null,
    agent_id: input.agentId,
    program_name: input.programName,
    status: input.status ?? "recommended",
    agent_note: input.agentNote ?? null,
    is_gap_filler: input.isGapFiller ?? false,
    enrolled_at: input.enrolledAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch programs for a family, optionally filtered by agent.
 * Returns mapped FamilyProgram array, ordered by created_at ascending.
 */
export async function getFamilyPrograms(
  supabase: SupabaseClient,
  familyId: string,
  agentId?: string
): Promise<FamilyProgram[]> {
  let query = supabase
    .from("family_programs")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`getFamilyPrograms: ${error.message}`);
  }

  return (data as ProgramRow[]).map(mapProgramRow);
}

/**
 * Insert a new family_programs row and return the mapped record.
 */
export async function addFamilyProgram(
  supabase: SupabaseClient,
  input: InsertProgramInput
): Promise<FamilyProgram> {
  const payload = buildProgramInsert(input);

  const { data, error } = await supabase
    .from("family_programs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`addFamilyProgram: ${error.message}`);
  }

  return mapProgramRow(data as ProgramRow);
}

/**
 * Update the status of an existing program. When enrolling,
 * pass an ISO date string for enrolledAt.
 */
export async function updateProgramStatus(
  supabase: SupabaseClient,
  id: string,
  status: ProgramStatus | string,
  enrolledAt?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "enrolled") {
    updates.enrolled_at = enrolledAt ?? new Date().toISOString();
  }

  const { error } = await supabase
    .from("family_programs")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new Error(`updateProgramStatus: ${error.message}`);
  }
}
