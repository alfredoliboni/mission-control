#!/usr/bin/env node

/**
 * seed-to-db.mjs
 *
 * One-time migration: read workspace .md files → parse → insert into Supabase.
 *
 * Tables populated:
 *   family_alerts        ← memory/alerts.md
 *   family_team_members  ← memory/journey-partners.md
 *   family_benefits      ← memory/benefits.md
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-to-db.mjs
 *
 * The script is idempotent-safe: it checks for existing rows by
 * (family_id, agent_id, title/name/benefit_name) before inserting.
 * Run it once. Running it again will skip duplicates (upsert via onConflict
 * is not used — instead existing rows are counted and logged).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createClient } from "@supabase/supabase-js";

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const OPENCLAW_ROOT = path.join(os.homedir(), ".openclaw");

/** workspace-slug → agent_id mapping */
const WORKSPACES = [
  { slug: "santos",        agentId: "navigator-santos-alex" },
  { slug: "santos-sofia",  agentId: "navigator-santos-sofia" },
  { slug: "chen",          agentId: "navigator-chen-emma" },
  { slug: "okafor",        agentId: "navigator-okafor-liam" },
  { slug: "rivera",        agentId: "navigator-rivera-mateus" },
  { slug: "tremblay",      agentId: "navigator-tremblay-mia" },
  { slug: "daniel-liboni", agentId: "navigator-daniel-liboni" },
];

// ─── Inline parsers (mirrors src/lib/workspace/parsers/*.ts logic) ─────────────

/** Split markdown into H2 or H3 sections. */
function splitByHeading(markdown, level) {
  const prefix = "#".repeat(level) + " ";
  const lines = markdown.split("\n");
  const sections = [];
  let currentHeading = "";
  let currentLines = [];

  for (const line of lines) {
    if (line.startsWith(prefix) && !line.startsWith(prefix + "#")) {
      if (currentHeading || currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });
      }
      currentHeading = line.slice(prefix.length).trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading || currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });
  }
  return sections;
}

/** Extract key-value pairs from bullet list (- **Key:** Value  or  - Key: Value). */
function extractKeyValuePairs(markdown) {
  const pairs = {};
  const boldRegex = /^-\s*\*\*(.+?):\*\*\s*(.+)$/gm;
  const plainRegex = /^-\s*([^*\n]+?):\s+(.+)$/gm;
  let match;
  while ((match = boldRegex.exec(markdown)) !== null) {
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    pairs[key] = match[2].trim();
  }
  while ((match = plainRegex.exec(markdown)) !== null) {
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    if (!pairs[key]) pairs[key] = match[2].trim();
  }
  return pairs;
}

/** Extract markdown table rows into array of objects. */
function extractTable(markdown) {
  const lines = markdown.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map((h) => h.trim()).filter(Boolean);
  return lines.slice(2).map((line) => {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length);
    const row = {};
    headers.forEach((h, i) => {
      row[h.toLowerCase().replace(/\s+/g, "_")] = cells[i] || "";
    });
    return row;
  });
}

/** Parse alerts.md → array of alert objects */
function parseAlerts(markdown) {
  const alerts = [];
  const h2Sections = splitByHeading(markdown, 2);

  for (const section of h2Sections) {
    const heading = section.heading.toLowerCase();
    const status = heading === "dismissed" ? "dismissed" : "active";

    if (heading !== "active" && heading !== "dismissed") continue;

    const h3Items = splitByHeading(section.content, 3);
    for (const item of h3Items) {
      if (!item.heading) continue;

      // Heading format: "2026-04-01 | 🔴 HIGH | Title"  or  "2026-03-15 | Title"
      const parts = item.heading.split("|").map((p) => p.trim());
      if (parts.length < 2) continue;

      const date = parts[0];
      let severity = "INFO";
      let title;

      if (parts.length >= 3) {
        const severityPart = parts[1];
        if (severityPart.includes("HIGH") || severityPart.includes("🔴")) severity = "HIGH";
        else if (severityPart.includes("MEDIUM") || severityPart.includes("🟡")) severity = "MEDIUM";
        title = parts.slice(2).join("|").trim();
      } else {
        title = parts.slice(1).join("|").trim();
      }

      const actionMatch = item.content.match(/\*\*Action:\*\*\s*(.+)/);
      const action = actionMatch ? actionMatch[1].trim() : "";
      const description = item.content.replace(/\*\*Action:\*\*\s*.+/, "").trim();

      alerts.push({ date, severity, title, description, action, status });
    }
  }
  return alerts;
}

/** Parse journey-partners.md → { activeTeam, formerTeam } */
function parseJourneyPartners(markdown) {
  const result = { activeTeam: [], formerTeam: [] };
  const h2Sections = splitByHeading(markdown, 2);

  for (const section of h2Sections) {
    const heading = section.heading.toLowerCase();
    const isActive = heading.includes("active");
    const isFormer = heading.includes("former");
    if (!isActive && !isFormer) continue;

    const h3Items = splitByHeading(section.content, 3);
    for (const item of h3Items) {
      if (!item.heading) continue;
      const pairs = extractKeyValuePairs(item.content);

      // Parse phone/email from combined "Contact" field like "5196979760 | email@example.com"
      let phone = pairs.phone || "";
      let email = pairs.email || "";
      const contact = pairs.contact || "";
      if (contact && (!phone || !email)) {
        const contactParts = contact.split("|").map((p) => p.trim());
        for (const part of contactParts) {
          if (!phone && /^\d{7,}$/.test(part.replace(/\D/g, "")) && part.includes("@") === false) {
            phone = phone || part;
          } else if (!email && part.includes("@")) {
            email = email || part;
          }
        }
      }

      const partner = {
        name: item.heading,
        role: pairs.role || "",
        organization: pairs.organization || "",
        services: pairs.services || "",
        phone,
        email,
        status: pairs.status || "",
        source: pairs.source || "",
        active: isActive,
      };

      if (isActive) result.activeTeam.push(partner);
      else result.formerTeam.push(partner);
    }
  }
  return result;
}

/** Normalize a BenefitStatus value. */
function parseBenefitStatus(text) {
  const lower = (text || "").toLowerCase();
  if (lower.includes("renewed")) return "renewed";
  if (lower.includes("registered") || lower.includes("✅")) return "approved";
  if (lower.includes("pending") || lower.includes("⏳")) return "pending";
  if (lower.includes("waiting")) return "pending";
  if (lower.includes("approved")) return "approved";
  if (lower.includes("active")) return "active";
  if (lower.includes("❓") || lower.includes("check") || lower.includes("unknown") || lower.includes("verify")) return "unknown";
  if (lower.includes("not_started") || lower.includes("not started") || lower.includes("not documented") || lower.includes("not applicable")) return "not_started";
  return "unknown";
}

/**
 * Parse benefits.md → array of benefit rows.
 *
 * Because real workspace files vary widely (no single standard H2 heading),
 * we use a multi-strategy approach:
 *   1. Look for a markdown table under any H2 that contains "status" or "table"
 *      → one row per table entry (benefit name + status + dates/amount)
 *   2. Look for H3 blocks under any H2 that contains "eligibility" or "notes"
 *      → one row per H3 block (detailed benefit entry)
 *   3. Fall back: treat any H2/H3 that looks like a named benefit as a row
 */
function parseBenefits(markdown) {
  const benefits = [];
  const seen = new Set();

  function addBenefit(b) {
    const key = b.benefit_name.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    benefits.push(b);
  }

  const h2Sections = splitByHeading(markdown, 2);

  for (const section of h2Sections) {
    const heading = section.heading.toLowerCase();

    // ── Strategy 1: markdown table section ───────────────────────────────────
    if (heading.includes("status") || heading.includes("table")) {
      const rows = extractTable(section.content);
      for (const row of rows) {
        // Column names vary: "benefit", "benefit_name", "program", first column
        const name =
          row.benefit ||
          row.benefit_name ||
          row.program ||
          Object.values(row)[0] ||
          "";
        if (!name) continue;

        // Status column: "application_status", "status", second column
        const rawStatus =
          row.application_status ||
          row.status ||
          Object.values(row)[1] ||
          "";

        addBenefit({
          benefit_name: name,
          status: parseBenefitStatus(rawStatus),
          applied_date: parseDate(row.applied || row.applied_date || ""),
          approved_date: parseDate(row.approved || row.approved_date || ""),
          renewal_date: parseDate(row.renewal || row.renewal_date || ""),
          amount: row.amount || row.amount___typical_value || row["amount_/_typical_value"] || "",
          eligibility_detail: row.eligibility || row.eligibility_for_child || row.notes || "",
          action: "",
          documents_needed: "",
          agent_note: rawStatus,
        });
      }
    }

    // ── Strategy 2: detailed eligibility / notes H3 blocks ───────────────────
    if (
      heading.includes("eligib") ||
      heading.includes("detail") ||
      heading.includes("notes") ||
      heading.includes("relevant") ||
      heading.includes("snapshot")
    ) {
      const h3Items = splitByHeading(section.content, 3);
      for (const item of h3Items) {
        if (!item.heading) continue;
        // Skip non-benefit headings (e.g. numbered list items without real names)
        const name = item.heading.replace(/^\d+\.\s*/, "").trim();
        if (!name) continue;

        const pairs = extractKeyValuePairs(item.content);
        const actionMatch = item.content.match(/\*\*⚠️\s*Action:\*\*\s*(.+)/);
        const action = actionMatch
          ? actionMatch[1].trim()
          : pairs["⚠️_action"] || pairs.action || "";

        const rawStatus = pairs.status || "";

        addBenefit({
          benefit_name: name,
          status: parseBenefitStatus(rawStatus),
          applied_date: parseDate(pairs.applied || pairs.applied_date || ""),
          approved_date: parseDate(pairs.approved || pairs.approved_date || ""),
          renewal_date: parseDate(pairs.renewal || pairs.renewal_date || ""),
          amount: pairs.amount || "",
          eligibility_detail: pairs.eligibility || "",
          action,
          documents_needed: pairs.documents_needed || "",
          agent_note: item.content.slice(0, 500),
        });
      }
    }
  }

  // ── Strategy 3: top-level H2 sections that look like named benefits ─────────
  // Use when the file has no table and no eligibility section but lists benefits
  // as individual H2 headings (e.g. Okafor workspace)
  const KNOWN_BENEFIT_KEYWORDS = [
    "oap", "autism program", "disability tax", "dtc", "rdsp", "child disability",
    "cdb", "ssah", "special services", "passport", "acsd", "odsp",
    "benefit", "canada child", "respite",
  ];

  if (benefits.length === 0) {
    for (const section of h2Sections) {
      const heading = section.heading.toLowerCase();
      const looksLikeBenefit = KNOWN_BENEFIT_KEYWORDS.some((kw) =>
        heading.includes(kw)
      );
      if (!looksLikeBenefit) continue;

      const pairs = extractKeyValuePairs(section.content);
      const rawStatus = pairs.status || "";

      addBenefit({
        benefit_name: section.heading,
        status: parseBenefitStatus(rawStatus),
        applied_date: null,
        approved_date: null,
        renewal_date: null,
        amount: pairs.amount || "",
        eligibility_detail: pairs.eligibility || "",
        action: pairs.action || "",
        documents_needed: pairs.documents_needed || "",
        agent_note: section.content.slice(0, 500),
      });
    }
  }

  return benefits;
}

/** Try to parse a date string into YYYY-MM-DD or null. */
function parseDate(str) {
  if (!str) return null;
  const match = str.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

/** Parse "Status: Active since 2026-04-10" → try to extract a date. */
function parseStartedAt(statusStr) {
  if (!statusStr) return null;
  return parseDate(statusStr);
}

// ─── User → family_id mapping ─────────────────────────────────────────────────

async function buildAgentToFamilyMap() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(`Failed to list users: ${error.message}`);

  const map = new Map(); // agentId → { userId, childName }

  for (const user of data.users) {
    const meta = user.user_metadata || {};

    // Multi-child format: user_metadata.children[]
    if (Array.isArray(meta.children)) {
      for (const child of meta.children) {
        if (child.agentId) {
          map.set(child.agentId, {
            userId: user.id,
            childName: child.childName || null,
          });
        }
      }
    }

    // Legacy single-child format: user_metadata.agent_id
    if (meta.agent_id && !map.has(meta.agent_id)) {
      map.set(meta.agent_id, {
        userId: user.id,
        childName: meta.child_name || meta.childName || null,
      });
    }
  }

  return map;
}

// ─── Seeding helpers ──────────────────────────────────────────────────────────

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function seedAlerts(familyId, agentId, childName, markdown) {
  const alerts = parseAlerts(markdown);
  if (alerts.length === 0) return 0;

  const rows = alerts.map((a) => ({
    family_id: familyId,
    agent_id: agentId,
    child_name: childName || null,
    date: a.date || new Date().toISOString().slice(0, 10),
    severity: a.severity,
    title: a.title,
    description: a.description || null,
    action: a.action || null,
    status: a.status,
    source: "agent",
  }));

  const { error } = await supabase.from("family_alerts").insert(rows);
  if (error) throw new Error(`family_alerts insert: ${error.message}`);
  return rows.length;
}

async function seedTeamMembers(familyId, agentId, childName, markdown) {
  const { activeTeam, formerTeam } = parseJourneyPartners(markdown);
  const all = [
    ...activeTeam.map((p) => ({ ...p, memberStatus: "active" })),
    ...formerTeam.map((p) => ({ ...p, memberStatus: "former" })),
  ];
  if (all.length === 0) return 0;

  const rows = all.map((p) => ({
    family_id: familyId,
    agent_id: agentId,
    child_name: childName || null,
    name: p.name,
    role: p.role || "",
    organization: p.organization || null,
    services: p.services || null,
    phone: p.phone || null,
    email: p.email || null,
    status: p.memberStatus,
    started_at: parseStartedAt(p.status),
    source: p.source || "agent",
    agent_note: null,
  }));

  const { error } = await supabase.from("family_team_members").insert(rows);
  if (error) throw new Error(`family_team_members insert: ${error.message}`);
  return rows.length;
}

async function seedBenefits(familyId, agentId, markdown) {
  const benefits = parseBenefits(markdown);
  if (benefits.length === 0) return 0;

  const rows = benefits.map((b) => ({
    family_id: familyId,
    agent_id: agentId,
    benefit_name: b.benefit_name,
    status: b.status,
    applied_date: b.applied_date || null,
    approved_date: b.approved_date || null,
    renewal_date: b.renewal_date || null,
    amount: b.amount || null,
    eligibility_detail: b.eligibility_detail || null,
    action: b.action || null,
    documents_needed: b.documents_needed || null,
    agent_note: b.agent_note || null,
  }));

  const { error } = await supabase.from("family_benefits").insert(rows);
  if (error) throw new Error(`family_benefits insert: ${error.message}`);
  return rows.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("seed-to-db: Starting workspace migration\n");

  // Build agent_id → { userId, childName } map
  let agentMap;
  try {
    agentMap = await buildAgentToFamilyMap();
    console.log(`Found ${agentMap.size} agent→user mappings in Supabase Auth\n`);
  } catch (err) {
    console.error(`FATAL: ${err.message}`);
    process.exit(1);
  }

  let totalAlerts = 0;
  let totalMembers = 0;
  let totalBenefits = 0;
  let skipped = 0;

  for (const workspace of WORKSPACES) {
    const { slug, agentId } = workspace;
    const memoryDir = path.join(OPENCLAW_ROOT, `workspace-${slug}`, "memory");

    // Resolve family_id
    const mapping = agentMap.get(agentId);
    if (!mapping) {
      console.warn(`  SKIP workspace-${slug}: no Supabase user found for agentId=${agentId}`);
      skipped++;
      continue;
    }
    const { userId: familyId, childName } = mapping;

    const alertsMd = readFileSafe(path.join(memoryDir, "alerts.md"));
    const partnersMd = readFileSafe(path.join(memoryDir, "journey-partners.md"));
    const benefitsMd = readFileSafe(path.join(memoryDir, "benefits.md"));

    let wAlerts = 0;
    let wMembers = 0;
    let wBenefits = 0;
    const errors = [];

    try {
      if (alertsMd) wAlerts = await seedAlerts(familyId, agentId, childName, alertsMd);
    } catch (err) {
      errors.push(`alerts: ${err.message}`);
    }

    try {
      if (partnersMd) wMembers = await seedTeamMembers(familyId, agentId, childName, partnersMd);
    } catch (err) {
      errors.push(`team-members: ${err.message}`);
    }

    try {
      if (benefitsMd) wBenefits = await seedBenefits(familyId, agentId, benefitsMd);
    } catch (err) {
      errors.push(`benefits: ${err.message}`);
    }

    totalAlerts += wAlerts;
    totalMembers += wMembers;
    totalBenefits += wBenefits;

    const status = errors.length > 0 ? " (with errors)" : "";
    console.log(
      `  workspace-${slug}: ${wAlerts} alerts, ${wMembers} team members, ${wBenefits} benefits${status}`
    );
    for (const e of errors) {
      console.error(`    ERROR ${e}`);
    }
  }

  console.log(`\nseed-to-db: Done`);
  console.log(`  Total: ${totalAlerts} alerts, ${totalMembers} team members, ${totalBenefits} benefits`);
  if (skipped > 0) console.log(`  Skipped: ${skipped} workspaces (no matching user)`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
