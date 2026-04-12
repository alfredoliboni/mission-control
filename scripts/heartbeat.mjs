#!/usr/bin/env node
/**
 * Agent Heartbeat Script
 *
 * Sends a heartbeat message to each OpenClaw Navigator agent via the Gateway API.
 * Each agent will follow its HEARTBEAT.md instructions to:
 * - Check approaching deadlines
 * - Search for new providers/programs
 * - Update workspace .md files
 *
 * Usage:
 *   node scripts/heartbeat.mjs                    # Run all agents
 *   node scripts/heartbeat.mjs navigator-santos   # Run one agent
 *
 * Cron (every 3 hours):
 *   0 0,3,6,9,12,15,18,21 * * * node scripts/heartbeat.mjs >> /tmp/heartbeat.log 2>&1
 *
 * Environment:
 *   COMPANION_API_DIRECT  — Gateway URL (default: http://localhost:18789)
 *   COMPANION_API_TOKEN   — Gateway auth token
 */

const GATEWAY_URL = process.env.COMPANION_API_DIRECT || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.COMPANION_API_TOKEN || "6d7433ddac74d4141bc5b78fc3ee54a62b99675fe265e90b";

const AGENTS = [
  "navigator-santos",
  "navigator-santos-sofia",
  "navigator-chen",
  "navigator-okafor",
  "navigator-tremblay",
  "navigator-rivera",
];

const HEARTBEAT_MESSAGE = `Run your heartbeat tasks now. Follow the instructions in HEARTBEAT.md:

1. Check if any alert deadlines are approaching (within 2 weeks). Update alerts.md if needed.
2. Check the Supabase providers table for new providers matching the child's needs and location. If found, update providers.md with recommendations.
3. Check for updates to OAP waitlists, benefit programs, or program availability.
4. Review pathway.md and update any progress or changed timelines.
5. If you found anything actionable, add a concise alert to alerts.md.

Keep updates brief and actionable. Only write to files if there's something new to report.`;

async function sendHeartbeat(agentId) {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] Heartbeat → ${agentId}...`);

  try {
    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(180000), // 3 minute timeout per agent
      headers: {
        "Authorization": `Bearer ${GATEWAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `openclaw/${agentId}`,
        messages: [
          { role: "system", content: "You are running a scheduled heartbeat check. Follow the instructions to update workspace files." },
          { role: "user", content: HEARTBEAT_MESSAGE },
        ],
        user: agentId,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`  ✗ ${agentId}: HTTP ${response.status} — ${text.slice(0, 200)}`);
      return { agentId, success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "(no response)";
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ✓ ${agentId}: ${elapsed}s — ${content.slice(0, 100)}...`);
    return { agentId, success: true, elapsed, summary: content.slice(0, 200) };
  } catch (err) {
    console.error(`  ✗ ${agentId}: ${err.message}`);
    return { agentId, success: false, error: err.message };
  }
}

async function main() {
  const targetAgent = process.argv[2];
  const agents = targetAgent ? [targetAgent] : AGENTS;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Heartbeat started: ${new Date().toISOString()}`);
  console.log(`Gateway: ${GATEWAY_URL}`);
  console.log(`Agents: ${agents.length}`);
  console.log(`${"=".repeat(60)}\n`);

  // Run agents sequentially to avoid overwhelming the gateway
  const results = [];
  for (const agentId of agents) {
    const result = await sendHeartbeat(agentId);
    results.push(result);
    // Small delay between agents
    if (agents.length > 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Heartbeat complete: ${succeeded} succeeded, ${failed} failed`);
  console.log(`${"=".repeat(60)}\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Heartbeat fatal error:", err);
  process.exit(1);
});
