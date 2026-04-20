// Apply the family_priorities migration and seed priorities for Daniel Liboni.
// Run once: node --env-file=.env.local scripts/seed-daniel-priorities.mjs
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const MOM_EMAIL = "luisa.liboni.ai+liboni@gmail.com";
const CHILD_NAME = "Daniel Liboni";

const admin = createClient(url, key, { auth: { persistSession: false } });

// 1. Resolve mom's user_id and find Daniel's agent_id in user_metadata.children[]
const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
if (listErr) { console.error(listErr); process.exit(1); }
const mom = list.users.find((u) => u.email === MOM_EMAIL);
if (!mom) { console.error(`No user with email ${MOM_EMAIL}`); process.exit(1); }

const children = mom.user_metadata?.children ?? [];
const daniel = children.find((c) => c.childName === CHILD_NAME);
if (!daniel?.agentId) {
  console.error(`Cannot find ${CHILD_NAME} in ${MOM_EMAIL} metadata.children.`);
  console.error("Metadata was:", JSON.stringify(mom.user_metadata, null, 2));
  process.exit(1);
}

console.log(`✓ Resolved family_id=${mom.id}  agent_id=${daniel.agentId}`);

// 2. Seed rows. Idempotent: wipe Daniel's priorities first, then insert fresh.
const { error: delErr } = await admin
  .from("family_priorities")
  .delete()
  .eq("family_id", mom.id)
  .eq("agent_id", daniel.agentId);
if (delErr) { console.error("Delete failed (table may not exist yet — run the migration first):", delErr); process.exit(1); }

const rows = [
  {
    family_id: mom.id,
    agent_id: daniel.agentId,
    child_name: CHILD_NAME,
    label: "SLP",
    detail: "speech-language support",
    why: "Dr. da Silva's assessment (2026-03-15) noted expressive-language gap; mom flagged regression in recent chat.",
    severity: "high",
    sort_order: 1,
    source: "conversation",
    agent_note: "Prioritize providers with pediatric SLP + AAC experience.",
  },
  {
    family_id: mom.id,
    agent_id: daniel.agentId,
    child_name: CHILD_NAME,
    label: "Social Skills",
    detail: "peer interaction support",
    why: "School IEP (uploaded 2026-04-02) highlights difficulty with peer play; mom mentioned same pattern.",
    severity: "medium",
    sort_order: 2,
    source: "upload",
    agent_note: "Look for group programs that mix clinical structure with peer play.",
  },
];

const { error: insErr } = await admin.from("family_priorities").insert(rows);
if (insErr) { console.error(insErr); process.exit(1); }

console.log(`✓ Seeded ${rows.length} priorities for ${CHILD_NAME}`);

// 3. Show the migration path so the user knows what to run in the SQL editor if needed.
const migPath = path.resolve("supabase/migrations/20260420_family_priorities.sql");
try {
  await fs.access(migPath);
  console.log(`  (if the table did not exist, apply: ${migPath})`);
} catch {}
