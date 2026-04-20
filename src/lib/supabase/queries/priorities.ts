import type { SupabaseClient } from "@supabase/supabase-js";

export interface PriorityRow {
  id: string;
  family_id: string;
  agent_id: string;
  child_name: string | null;
  label: string;
  detail: string | null;
  why: string | null;
  severity: string;
  status: string;
  sort_order: number | null;
  source: string | null;
  agent_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyPriority {
  id: string;
  familyId: string;
  agentId: string;
  childName: string | null;
  label: string;
  detail: string;
  why: string;
  severity: "high" | "medium" | "low";
  status: "active" | "addressed" | "archived";
  sortOrder: number;
  source: string;
  agentNote: string;
  createdAt: string;
  updatedAt: string;
}

export function mapPriorityRow(row: PriorityRow): FamilyPriority {
  return {
    id: row.id,
    familyId: row.family_id,
    agentId: row.agent_id,
    childName: row.child_name,
    label: row.label,
    detail: row.detail ?? "",
    why: row.why ?? "",
    severity: normalizeSeverity(row.severity),
    status: normalizeStatus(row.status),
    sortOrder: row.sort_order ?? 0,
    source: row.source ?? "agent",
    agentNote: row.agent_note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSeverity(raw: string): FamilyPriority["severity"] {
  if (raw === "high" || raw === "low") return raw;
  return "medium";
}

function normalizeStatus(raw: string): FamilyPriority["status"] {
  if (raw === "addressed" || raw === "archived") return raw;
  return "active";
}

/**
 * Fetches active priorities for a family+agent, ordered by sort_order then created_at.
 */
export async function getPriorities(
  supabase: SupabaseClient,
  familyId: string,
  agentId?: string
): Promise<FamilyPriority[]> {
  let query = supabase
    .from("family_priorities")
    .select("*")
    .eq("family_id", familyId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (agentId) query = query.eq("agent_id", agentId);

  const { data, error } = await query;
  if (error) throw new Error(`getPriorities: ${error.message}`);

  return (data as PriorityRow[]).map(mapPriorityRow);
}
