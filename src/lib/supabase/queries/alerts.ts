import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertSeverity } from "@/types/workspace";

// ── DB row type (snake_case — mirrors family_alerts table) ────────────────

export interface AlertRow {
  id: string;
  family_id: string;
  agent_id: string | null;
  child_name: string | null;
  date: string;
  severity: string;
  title: string;
  description: string | null;
  action: string | null;
  status: string;
  completed_at: string | null;
  notes: string[] | null;
  source: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Frontend type (camelCase) ─────────────────────────────────────────────

export interface FamilyAlert {
  id: string;
  familyId: string;
  agentId: string | null;
  childName: string | null;
  date: string;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  action: string | null;
  status: "active" | "dismissed" | "completed";
  completedAt: string | null;
  notes: string[];
  source: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Input type for inserts ────────────────────────────────────────────────

export interface InsertAlertInput {
  familyId: string;
  agentId?: string;
  childName?: string;
  date: string;
  severity?: AlertSeverity;
  title: string;
  description?: string;
  action?: string;
  status?: "active" | "dismissed" | "completed";
  notes?: string[];
  source?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────

export function mapAlertRowToAlert(row: AlertRow): FamilyAlert {
  return {
    id: row.id,
    familyId: row.family_id,
    agentId: row.agent_id,
    childName: row.child_name,
    date: row.date,
    severity: normalizeSeverity(row.severity),
    title: row.title,
    description: row.description,
    action: row.action,
    status: row.status as FamilyAlert["status"],
    completedAt: row.completed_at,
    notes: row.notes ?? [],
    source: row.source,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSeverity(raw: string): AlertSeverity {
  if (raw === "HIGH" || raw === "MEDIUM") return raw;
  return "INFO";
}

// ── Insert payload builder ────────────────────────────────────────────────

export function buildInsertPayload(input: InsertAlertInput): Record<string, unknown> {
  return {
    family_id: input.familyId,
    agent_id: input.agentId ?? null,
    child_name: input.childName ?? null,
    date: input.date,
    severity: input.severity ?? "INFO",
    title: input.title,
    description: input.description ?? null,
    action: input.action ?? null,
    status: input.status ?? "active",
    notes: input.notes ?? [],
    source: input.source ?? null,
    related_entity_type: input.relatedEntityType ?? null,
    related_entity_id: input.relatedEntityId ?? null,
  };
}

// ── Queries ───────────────────────────────────────────────────────────────

/**
 * Fetches alerts for a family, optionally filtered by agent.
 * Results are ordered by date descending (newest first).
 */
export async function getAlerts(
  supabase: SupabaseClient,
  familyId: string,
  agentId?: string
): Promise<FamilyAlert[]> {
  let query = supabase
    .from("family_alerts")
    .select("*")
    .eq("family_id", familyId)
    .order("date", { ascending: false });

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getAlerts: ${error.message}`);

  return (data as AlertRow[]).map(mapAlertRowToAlert);
}

/**
 * Inserts a new alert and returns the created record.
 */
export async function insertAlert(
  supabase: SupabaseClient,
  input: InsertAlertInput
): Promise<FamilyAlert> {
  const payload = buildInsertPayload(input);

  const { data, error } = await supabase
    .from("family_alerts")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`insertAlert: ${error.message}`);
  return mapAlertRowToAlert(data as AlertRow);
}

/**
 * Updates the status of an alert. When marking as completed,
 * pass an ISO timestamp for completedAt.
 */
export async function updateAlertStatus(
  supabase: SupabaseClient,
  alertId: string,
  status: string,
  completedAt?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "completed") {
    update.completed_at = completedAt ?? new Date().toISOString();
  }

  const { error } = await supabase
    .from("family_alerts")
    .update(update)
    .eq("id", alertId);

  if (error) throw new Error(`updateAlertStatus: ${error.message}`);
}

/**
 * Appends a note to the notes array of an alert.
 * Uses Postgres array append via rpc helper or client-side merge approach.
 */
export async function addAlertNote(
  supabase: SupabaseClient,
  alertId: string,
  note: string
): Promise<void> {
  // Fetch current notes, then append and update.
  const { data, error: fetchError } = await supabase
    .from("family_alerts")
    .select("notes")
    .eq("id", alertId)
    .single();

  if (fetchError) throw new Error(`addAlertNote (fetch): ${fetchError.message}`);

  const existing: string[] = (data as { notes: string[] | null }).notes ?? [];
  const updated = [...existing, note];

  const { error: updateError } = await supabase
    .from("family_alerts")
    .update({ notes: updated, updated_at: new Date().toISOString() })
    .eq("id", alertId);

  if (updateError) throw new Error(`addAlertNote (update): ${updateError.message}`);
}
