#!/usr/bin/env node

/**
 * mcp-supabase.mjs
 *
 * Stdio MCP server — gives OpenClaw agents Supabase CRUD tools for:
 *   family_alerts, family_team_members, family_benefits,
 *   family_programs, family_providers
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MCP_FAMILY_ID       — the family's Supabase user ID
 *
 * Optional:
 *   MCP_AGENT_ID        — agent identifier (e.g. "navigator-santos-alex")
 *
 * Spawn via OpenClaw:
 *   { "command": "node", "args": ["scripts/mcp-supabase.mjs"] }
 */

import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

// ─── Bootstrap ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  process.stderr.write(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ─── Agent → Family ID resolution (cached) ──────────────────────────────────
// The MCP server is global — shared by all agents. Each agent call includes
// context that tells us which workspace/agent is calling. We resolve the
// family_id from Supabase user_metadata.children[].agentId at startup.

let agentToFamily = {};
let currentAgentId = process.env.MCP_AGENT_ID ?? null;
let currentFamilyId = process.env.MCP_FAMILY_ID ?? null;

async function loadAgentMap() {
  const { data } = await supabase.auth.admin.listUsers();
  if (!data?.users) return;
  for (const u of data.users) {
    const children = u.user_metadata?.children || [];
    for (const child of children) {
      if (child.agentId) {
        agentToFamily[child.agentId] = u.id;
      }
    }
    if (u.user_metadata?.agent_id) {
      agentToFamily[u.user_metadata.agent_id] = u.id;
    }
  }
  process.stderr.write(`MCP: loaded ${Object.keys(agentToFamily).length} agent→family mappings\n`);
}

function resolveFamily(agentId) {
  if (agentId && agentToFamily[agentId]) return { familyId: agentToFamily[agentId], agentId };
  if (currentFamilyId) return { familyId: currentFamilyId, agentId: currentAgentId || "agent" };
  throw new Error(`Cannot resolve family for agent: ${agentId}. No MCP_FAMILY_ID set and agent not found in Supabase.`);
}

// Load map at startup
await loadAgentMap();

// ─── Tool definitions ───────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "create_alert",
    description:
      "Create a new alert/reminder for the family. Use for deadlines, important dates, action items.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Alert date in YYYY-MM-DD format",
        },
        severity: {
          type: "string",
          enum: ["HIGH", "MEDIUM", "INFO"],
          description: "Alert severity",
        },
        title: { type: "string", description: "Short alert title" },
        description: { type: "string", description: "Detailed description" },
        action: {
          type: "string",
          description: "What the family should do",
        },
      },
      required: ["date", "severity", "title"],
    },
  },
  {
    name: "dismiss_alert",
    description: "Dismiss an alert so it no longer appears as active.",
    inputSchema: {
      type: "object",
      properties: {
        alertId: { type: "string", description: "UUID of the alert to dismiss" },
      },
      required: ["alertId"],
    },
  },
  {
    name: "add_team_member",
    description:
      "Add a provider, doctor, or therapist to the family's care team.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        role: {
          type: "string",
          description: "e.g., Occupational Therapist, Pediatrician",
        },
        organization: { type: "string" },
        services: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        agent_note: {
          type: "string",
          description: "Why this person is a good fit for the family",
        },
      },
      required: ["name", "role"],
    },
  },
  {
    name: "remove_team_member",
    description:
      "Mark a team member as former (e.g., they left, no longer relevant).",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the team member to remove",
        },
        reason: { type: "string", description: "Why they are being removed" },
      },
      required: ["name", "reason"],
    },
  },
  {
    name: "add_benefit",
    description:
      "Track a benefit application for the family (DTC, OAP, ACSD, etc).",
    inputSchema: {
      type: "object",
      properties: {
        benefit_name: { type: "string" },
        status: {
          type: "string",
          enum: [
            "not_started",
            "pending",
            "approved",
            "denied",
            "active",
            "renewed",
          ],
        },
        applied_date: { type: "string" },
        amount: { type: "string" },
        eligibility_detail: { type: "string" },
        action: { type: "string" },
        documents_needed: { type: "string" },
        agent_note: { type: "string" },
      },
      required: ["benefit_name"],
    },
  },
  {
    name: "update_benefit",
    description:
      "Update the status and/or dates of an existing benefit by name.",
    inputSchema: {
      type: "object",
      properties: {
        benefit_name: {
          type: "string",
          description: "Exact benefit name to look up",
        },
        status: {
          type: "string",
          enum: [
            "not_started",
            "pending",
            "approved",
            "denied",
            "active",
            "renewed",
          ],
        },
        applied_date: { type: "string" },
        approved_date: { type: "string" },
      },
      required: ["benefit_name", "status"],
    },
  },
  {
    name: "add_program",
    description: "Recommend or track a program for the family.",
    inputSchema: {
      type: "object",
      properties: {
        program_name: { type: "string" },
        status: {
          type: "string",
          enum: [
            "recommended",
            "applied",
            "enrolled",
            "completed",
            "dropped",
          ],
        },
        is_gap_filler: { type: "boolean" },
        agent_note: { type: "string" },
      },
      required: ["program_name"],
    },
  },
  {
    name: "add_provider",
    description: "Recommend a provider for the family.",
    inputSchema: {
      type: "object",
      properties: {
        provider_name: { type: "string" },
        priority: {
          type: "string",
          enum: ["highest", "relevant", "other"],
        },
        status: {
          type: "string",
          enum: [
            "recommended",
            "contacted",
            "waitlisted",
            "active",
            "declined",
          ],
        },
        is_gap_filler: { type: "boolean" },
        agent_note: { type: "string" },
      },
      required: ["provider_name"],
    },
  },
  {
    name: "get_alerts",
    description:
      "Get all active alerts for this family. Returns alerts ordered by date descending.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_team",
    description:
      "Get all team members for this family (active and former).",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ─── Tool implementations ───────────────────────────────────────────────────

async function callTool(name, args, callerAgentId) {
  // Resolve which family this agent belongs to
  const ctx = resolveFamily(callerAgentId);
  const { familyId, agentId } = ctx;

  switch (name) {
    case "create_alert":
      return createAlert(args, familyId, agentId);
    case "dismiss_alert":
      return dismissAlert(args, familyId);
    case "add_team_member":
      return addTeamMember(args, familyId, agentId);
    case "remove_team_member":
      return removeTeamMember(args, familyId);
    case "add_benefit":
      return addBenefit(args, familyId, agentId);
    case "update_benefit":
      return updateBenefit(args, familyId);
    case "add_program":
      return addProgram(args, familyId, agentId);
    case "add_provider":
      return addProvider(args, familyId, agentId);
    case "get_alerts":
      return getAlerts(familyId);
    case "get_team":
      return getTeam(familyId);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function createAlert({ date, severity, title, description, action }, familyId, agentId) {
  const { data, error } = await supabase
    .from("family_alerts")
    .insert({
      family_id: familyId,
      agent_id: agentId,
      date,
      severity: severity ?? "INFO",
      title,
      description: description ?? null,
      action: action ?? null,
      status: "active",
      source: "agent",
    })
    .select()
    .single();

  if (error) throw new Error(`create_alert failed: ${error.message}`);
  return { success: true, alert: data };
}

async function dismissAlert({ alertId }, familyId) {
  const { error } = await supabase
    .from("family_alerts")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("family_id", familyId);

  if (error) throw new Error(`dismiss_alert failed: ${error.message}`);
  return { success: true, alertId };
}

async function addTeamMember({
  name,
  role,
  organization,
  services,
  phone,
  email,
  agent_note,
}, familyId, agentId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("family_team_members")
    .insert({
      family_id: familyId,
      agent_id: agentId,
      name,
      role,
      organization: organization ?? null,
      services: services ?? null,
      phone: phone ?? null,
      email: email ?? null,
      status: "active",
      started_at: today,
      source: "agent",
      agent_note: agent_note ?? null,
      permissions: {},
    })
    .select()
    .single();

  if (error) throw new Error(`add_team_member failed: ${error.message}`);
  return { success: true, member: data };
}

async function removeTeamMember({ name, reason }, familyId) {
  // Find by name within this family
  const { data: rows, error: findError } = await supabase
    .from("family_team_members")
    .select("id")
    .eq("family_id", familyId)
    .eq("name", name)
    .neq("status", "former")
    .limit(1);

  if (findError) throw new Error(`remove_team_member (find) failed: ${findError.message}`);
  if (!rows || rows.length === 0) {
    return { success: false, message: `No active team member named "${name}" found` };
  }

  const memberId = rows[0].id;
  const { error } = await supabase
    .from("family_team_members")
    .update({
      status: "former",
      removed_at: new Date().toISOString().slice(0, 10),
      removed_reason: reason,
    })
    .eq("id", memberId);

  if (error) throw new Error(`remove_team_member (update) failed: ${error.message}`);
  return { success: true, memberId, name };
}

async function addBenefit({
  benefit_name,
  status,
  applied_date,
  amount,
  eligibility_detail,
  action,
  documents_needed,
  agent_note,
}, familyId, agentId) {
  const { data, error } = await supabase
    .from("family_benefits")
    .insert({
      family_id: familyId,
      agent_id: agentId,
      benefit_name,
      status: status ?? "not_started",
      applied_date: applied_date ?? null,
      approved_date: null,
      renewal_date: null,
      amount: amount ?? null,
      eligibility_detail: eligibility_detail ?? null,
      action: action ?? null,
      documents_needed: documents_needed ?? null,
      agent_note: agent_note ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`add_benefit failed: ${error.message}`);
  return { success: true, benefit: data };
}

async function updateBenefit({
  benefit_name,
  status,
  applied_date,
  approved_date,
}, familyId) {
  // Find by name within this family
  const { data: rows, error: findError } = await supabase
    .from("family_benefits")
    .select("id")
    .eq("family_id", familyId)
    .eq("benefit_name", benefit_name)
    .limit(1);

  if (findError) throw new Error(`update_benefit (find) failed: ${findError.message}`);
  if (!rows || rows.length === 0) {
    return {
      success: false,
      message: `No benefit named "${benefit_name}" found — use add_benefit first`,
    };
  }

  const updates = { status, updated_at: new Date().toISOString() };
  if (applied_date) updates.applied_date = applied_date;
  if (approved_date) updates.approved_date = approved_date;

  const { error } = await supabase
    .from("family_benefits")
    .update(updates)
    .eq("id", rows[0].id);

  if (error) throw new Error(`update_benefit failed: ${error.message}`);
  return { success: true, benefit_name, status };
}

async function addProgram({ program_name, status, is_gap_filler, agent_note }, familyId, agentId) {
  const { data, error } = await supabase
    .from("family_programs")
    .insert({
      family_id: familyId,
      agent_id: agentId,
      program_name,
      status: status ?? "recommended",
      is_gap_filler: is_gap_filler ?? false,
      agent_note: agent_note ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`add_program failed: ${error.message}`);
  return { success: true, program: data };
}

async function addProvider({
  provider_name,
  priority,
  status,
  is_gap_filler,
  agent_note,
}, familyId, agentId) {
  const { data, error } = await supabase
    .from("family_providers")
    .insert({
      family_id: familyId,
      agent_id: agentId,
      provider_name,
      priority: priority ?? "relevant",
      status: status ?? "recommended",
      is_gap_filler: is_gap_filler ?? false,
      agent_note: agent_note ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`add_provider failed: ${error.message}`);
  return { success: true, provider: data };
}

async function getAlerts(familyId) {
  const { data, error } = await supabase
    .from("family_alerts")
    .select("*")
    .eq("family_id", familyId)
    .eq("status", "active")
    .order("date", { ascending: false });

  if (error) throw new Error(`get_alerts failed: ${error.message}`);
  return { alerts: data ?? [] };
}

async function getTeam(familyId) {
  const { data, error } = await supabase
    .from("family_team_members")
    .select("*")
    .eq("family_id", familyId)
    .order("started_at", { ascending: false });

  if (error) throw new Error(`get_team failed: ${error.message}`);

  const members = data ?? [];
  return {
    active: members.filter((m) => m.status === "active"),
    former: members.filter((m) => m.status === "former"),
  };
}

// ─── MCP protocol handler ───────────────────────────────────────────────────

async function handleRequest(request) {
  const { method, id, params } = request;

  try {
    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "companion-supabase", version: "1.0.0" },
          capabilities: { tools: {} },
        },
      };
    }

    if (method === "notifications/initialized" || method === "ping") {
      // No response needed for notifications; send empty result for ping
      if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
      return null;
    }

    if (method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      };
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params;
      // OpenClaw sets MCP_AGENT_ID env var per-agent, or we fall back to env
      const callerAgentId = currentAgentId;
      const result = await callTool(name, args ?? {}, callerAgentId);
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      };
    }

    // Unknown method
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: err.message },
    };
  }
}

// ─── Stdio loop ─────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      }) + "\n"
    );
    return;
  }

  const response = await handleRequest(request);
  if (response !== null) {
    process.stdout.write(JSON.stringify(response) + "\n");
  }
});

rl.on("close", () => {
  process.exit(0);
});
