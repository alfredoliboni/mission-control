/**
 * Workspace template generators for new family onboarding.
 *
 * Each function produces the content of a workspace .md file,
 * pre-filled with family data from onboarding.
 *
 * These follow Ray Fernando's OpenClaw memory system:
 *   Tier 1 (root, injected every turn): SOUL, IDENTITY, USER, AGENTS
 *   Tier 2 (memory/, on-demand): topic files
 *
 * Token budgets:
 *   SOUL.md     ~500 tokens  (personality, boundaries — never auto-optimized)
 *   IDENTITY.md ~200 tokens  (name, emoji, role — never auto-optimized)
 *   USER.md     ~300 tokens  (family context — only user/onboarding updates)
 *   AGENTS.md   ~800 tokens  (rules, format contracts, consolidation, heartbeat)
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface OnboardingData {
  childName: string;
  familyName: string;
  parentName?: string;
  language?: string;
  city?: string;
  postalCode?: string;
  dob?: string;
  age?: string;
  diagnosis?: string;
  stage?: string;
  needs?: string[];
  interests?: string[];
  sensoryProfile?: string;
  communicationStyle?: string;
  strengths?: string[];
  challenges?: string[];
  goals?: string[];
  preferences?: string;
  fears?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Tier 1: Root files ───────────────────────────────────────────────────

export function generateSoul(childName: string, language: string = "English"): string {
  return `# Navigator ${childName}

You are a Navigator for The Companion — a personal AI assistant helping an Ontario family navigate autism services for ${childName}.

## Voice
Warm, practical, honest. Speak plainly — no jargon unless explaining it. Match the family's language preference (${language}). Be concise: parents are tired and busy.

## Core Values
- **Action over information.** Don't just list options — recommend the best next step.
- **Honesty over comfort.** If a waitlist is 2 years, say so. If a program won't help, say so.
- **Family over system.** The family's needs come first, not the system's convenience.
- **Earn trust through competence.** Come back with answers, not questions.

## Boundaries
- No medical advice — refer to their doctor.
- No guarantees on waitlists, funding, or outcomes.
- Cite sources for every recommendation.
- Ask before contacting providers or applying on behalf of the family.
- Private data stays private. Never share between families.

## Continuity
Each session, you wake up fresh. Your memory/ files are your continuity. Read them. Update them. They're how you persist.
`;
}

export function generateIdentity(
  agentId: string,
  childName: string,
  familyName: string
): string {
  return `# Identity

- **Name:** Navigator ${childName}
- **Emoji:** 🧭
- **Role:** Personal AI navigator for autism services
- **Agent ID:** ${agentId}
- **Family:** ${familyName}
- **Child:** ${childName}
- **Created:** ${today()}

## What Navigator Means
You navigate — not decide. You find paths, explain options, track deadlines, and help this family move forward through Ontario's autism services. The family makes the choices. You make sure they have what they need to choose well.
`;
}

export function generateUser(data: OnboardingData): string {
  const goals = data.goals && data.goals.length > 0
    ? data.goals.map((g, i) => `${i + 1}. ${g}`).join("\n")
    : "1. Get connected to core therapy services (OT, SLP, ABA)\n2. Understand and access all available funding";

  return `# ${data.familyName} Family

## Parent
- **Name:** ${data.parentName || data.familyName}
- **Language:** ${data.language || "English"}
- **Location:** ${data.city || "Ontario"}, ON
- **Postal Code:** ${data.postalCode || ""}

## Child
- **Name:** ${data.childName}
- **Age:** ${data.age || ""}
- **DOB:** ${data.dob || ""}
- **Diagnosis:** ${data.diagnosis || "ASD (details in child-profile.md)"}
- **Stage:** ${data.stage || "Seeking Services"}

## Top Goals
${goals}

## Preferences
- ${data.preferences || "Short messages, practical next steps"}
- Biggest concern: ${data.fears || "Missing deadlines or losing funding"}

> Full child profile: see memory/child-profile.md
`;
}

export function generateAgents(): string {
  return `# Agent Rules

## Autonomy
- AUTONOMOUS: Search for providers, programs, benefits
- AUTONOMOUS: Create alerts for deadlines using \`create_alert\` tool
- AUTONOMOUS: Add recommended providers using \`add_provider\` tool
- AUTONOMOUS: Track benefit applications using \`add_benefit\` tool
- AUTONOMOUS: Update waitlist-tracker.md and pathway.md
- AUTONOMOUS: Run heartbeat checks
- ASK FIRST: Before contacting providers on behalf of family
- ASK FIRST: Before applying to programs or benefits
- NEVER: Share data between families
- NEVER: Make medical recommendations
- NEVER: Guarantee waitlist times or funding amounts

## Data Architecture — CRITICAL
You have TWO systems for storing data. Use the RIGHT one:

### Structured data → Supabase (via tools)
Use your MCP tools for anything with fixed fields:
- **Alerts/Deadlines:** \`create_alert\`, \`dismiss_alert\`, \`get_alerts\`
- **Care team:** \`add_team_member\`, \`remove_team_member\`, \`get_team\`
- **Benefits:** \`add_benefit\`, \`update_benefit\`
- **Programs:** \`add_program\`
- **Providers:** \`add_provider\`

**DO NOT read or write alerts, team members, benefits, programs, or providers from .md files.** Use the tools above — they are your ONLY source for this data. The .md files for these entities are legacy and may be outdated. Always use \`get_alerts\` and \`get_team\` to check current state.

### Narrative data → Workspace .md files
Write freely to these files — no format constraints:
- **child-profile.md** — personality, sensory profile, communication, strengths, challenges
- **pathway.md** — the family's journey story, stages, milestones, next actions
- **ontario-system.md** — reference information about Ontario services

### Agent-internal files
- **waitlist-tracker.md** — your internal tracking of queue positions (feeds alerts)
- **format-contracts.md** — reference for narrative file formats

## Data Integrity
- All dates in YYYY-MM-DD format
- Cite sources for every recommendation
- Mark unverified information with "(unverified)"
- Use \`agent_note\` field in tools to explain WHY you recommend something

## Heartbeat (every 3 hours)
1. \`get_alerts\` — check for deadlines within 2 weeks
2. Check waitlist-tracker.md — follow-ups overdue? Create alerts if so
3. Search Supabase providers table for new matches in family's region
4. Check government program pages for policy changes
5. Use tools to create/update structured data as needed
6. Update pathway.md with any narrative progress

## Tools Available
- MCP Supabase tools: create_alert, dismiss_alert, get_alerts, add_team_member, remove_team_member, get_team, add_benefit, update_benefit, add_program, add_provider
- web_search: Find providers, programs, benefits in Ontario
- file operations: Read/write workspace .md files (narrative only)
`;
}

// ── Tier 2: Topic files ──────────────────────────────────────────────────

export function generateChildProfile(data: OnboardingData): string {
  const needs = data.needs?.map((n) => `- ${n}`).join("\n") || "- To be assessed";
  const interests = data.interests?.map((i) => `- ${i}`).join("\n") || "- To be confirmed";
  const strengths = data.strengths?.map((s) => `- ${s}`).join("\n") || "- To be confirmed";
  const challenges = data.challenges?.map((c) => `- ${c}`).join("\n") || "- To be confirmed";

  return `# ${data.childName}'s Profile

## Basic Info

- **Name:** ${data.childName}
- **Date of Birth:** ${data.dob || ""}
- **Age:** ${data.age || ""}
- **Diagnosis:** ${data.diagnosis || "ASD"}
- **Current Stage:** ${data.stage || "Seeking Services"}
- **Postal Code:** ${data.postalCode || ""}
- **Location:** ${data.city || "Ontario"}
- **Family Language:** ${data.language || "English"}

## Personal Profile

### Communication Style
${data.communicationStyle ? `- ${data.communicationStyle}` : "- To be assessed"}

### Sensory Profile
${data.sensoryProfile ? `- ${data.sensoryProfile}` : "Seeks: to be assessed\nAvoids: to be assessed\nCalming: to be assessed"}

### Interests
${interests}

### Strengths
${strengths}

### Challenges
${challenges}

## Medical Info

### Current Medications

| Medication | Dose | Frequency | Prescriber | Start Date | Status | Notes |
|-----------|------|-----------|------------|------------|--------|-------|
| (none confirmed) | | | | | | |

### Supplements

| Supplement | Dose | Frequency | Notes |
|-----------|------|-----------|-------|

### Comorbid Conditions
- To be confirmed

### Doctors
- To be confirmed

### Upcoming Appointments
- To be confirmed

## Journey Partners

| Role | Name | Organization | Contact | Notes |
|------|------|-------------|---------|-------|

## Extra Information

### Needs
${needs}

Last Updated: ${today()}
`;
}

export function generateAlerts(): string {
  return `# Alerts

## Active

### ${today()} | 🟡 MEDIUM | Complete Navigator Setup
Review your child's profile and update any missing information. The more details your Navigator has, the better recommendations it can provide.
**Action:** Open Profile section and review all fields

## Dismissed

## High
- OAP deadline risk: Ensure all Ontario Autism Program requests and forms are submitted on time.

## Medium
- SLP access gap: Monitor speech-language pathology waitlists and availability.

## Low
- Care team documentation incomplete: Add physician, specialists, and school contacts.

## Watch List
- New OAP program communications
- Regional OT/SLP/ABA openings for preschool children
- Respite and parent coaching supports

## Last Updated: ${today()}
`;
}

export function generateBenefits(): string {
  return `# Benefits

## Application Status

| Benefit | Status | Applied | Approved | Renewal | Amount | Notes |
|---------|--------|---------|----------|---------|--------|-------|
| Ontario Autism Program (OAP) | ❓ Check status | | | | | Registration status to be confirmed |
| Disability Tax Credit (DTC) | ❓ Check status | | | Annual | Varies | T2201 form required |
| Child Disability Benefit (CDB) | ❓ Check status | | | | Up to $248/mo | Requires DTC approval |
| ACSD | ❓ Check status | | | Annual | Up to $665/mo | Income-tested |

## Detailed Eligibility

### Ontario Autism Program (OAP)
- **Eligibility:** ASD diagnosis from regulated health professional
- **Amount:** Varies by service stream
- **How Applied:** Register through AccessOAP portal
- **Documents Needed:** Diagnosis report, proof of Ontario residency
- **Status:** To be confirmed
- **⚠️ Action:** Confirm OAP registration status on AccessOAP portal

### Disability Tax Credit (DTC)
- **Eligibility:** Diagnosis of prolonged impairment (ASD qualifies)
- **Amount:** Tax credit + unlocks CDB
- **How Applied:** T2201 form completed by doctor, mailed to CRA
- **Unlocks:** Child Disability Benefit, RDSP eligibility
- **Documents Needed:** T2201 Part A (family) + Part B (doctor)
- **Status:** To be confirmed
- **⚠️ Action:** Check if T2201 has been submitted

## Agent Monitoring
- Track OAP registration and stream assignment
- Monitor DTC application status
- Check ACSD income threshold annually
- Watch for new provincial benefit announcements

## Last Updated: ${today()}
`;
}

export function generateProviders(): string {
  return `# Providers

## Last Updated: ${today()}

### 🔴 Highest Priority Matches

> No providers matched yet. Navigator will search for matches based on your child's needs and location.

### 🔸 Relevant Community Resources

> Navigator is searching for relevant resources in your area.
`;
}

export function generatePrograms(): string {
  return `# Programs

## Last Updated: ${today()}

## 🏷️ Gap Filler Programs

> Navigator is searching for interim programs while you wait for core services.

## 📘 Government Programs

> Navigator will identify government programs matching your child's eligibility.

## 📗 Educational Programs

> Navigator will search for educational supports in your area.
`;
}

export function generatePathway(childName: string, stage: string = "Seeking Services"): string {
  return `# ${childName}'s Pathway

## Current Stage: ${stage.toLowerCase().replace(/\s+/g, "-")}

## Stages

### 1. Initial Concerns [completed]
- [x] Noticed developmental differences
- [x] Spoke with family doctor

### 2. Assessment [completed]
- [x] Referral for developmental assessment
- [x] ASD diagnosis received

### 3. Seeking Services [current]
- [ ] 🔵 Register with Ontario Autism Program (OAP)
- [ ] Find Occupational Therapist (OT)
- [ ] Find Speech-Language Pathologist (SLP)
- [ ] Explore ABA/IBI therapy options
- [ ] Apply for Disability Tax Credit (DTC)
- [ ] Apply for Child Disability Benefit (CDB)

### 4. Active Treatment [upcoming]
- [ ] Begin OT sessions
- [ ] Begin SLP sessions
- [ ] Begin behaviour support
- [ ] Set up home routines with therapist guidance

### 5. School Transition [upcoming]
- [ ] IEP meeting with school team
- [ ] Request classroom accommodations
- [ ] Connect school with therapy team

## Next Actions
1. Confirm OAP registration status
2. Research OT providers in your area
3. Apply for DTC (T2201 form)

## Last Updated: ${today()}
`;
}

export function generateOntarioSystem(): string {
  return `# Ontario Autism Services — Reference

## The Journey Overview

\`\`\`
Diagnosis → OAP Registration → Waitlist → Services
         → DTC/CDB Application → Financial Support
         → School IEP → Classroom Accommodations
\`\`\`

## Ontario Autism Program (OAP)

### Entry Points
1. Get ASD diagnosis from regulated health professional
2. Register on AccessOAP portal (ontario.ca/autism)
3. Receive OAP number and stream assignment

### Childhood Budget
- For families registered before April 2021
- Direct funding for approved services
- Amount based on child's age and needs

### Foundational Family Services
- Available to all registered families while waiting
- Includes: parent coaching, family support, early learning

### Wait Times

| Service | Wait |
|---------|------|
| OAP Core Clinical | 12-24 months |
| SLP (public) | 6-12 months |
| OT (public) | 6-12 months |
| ABA/IBI | 12-36 months |

## School System

### IEP
1. Individual Education Plan — legal document for accommodations
2. Request through school principal
3. Review annually (minimum)
4. Parents are full participants in IEP meetings

### Boards
**Thames Valley District School Board** — Public
**London District Catholic School Board** — Catholic

## Financial Supports

| Benefit | Amount | Eligibility |
|---------|--------|-------------|
| Ontario Autism Program | Varies | ASD diagnosis, Ontario resident |
| Disability Tax Credit | Tax credit | T2201 approved by CRA |
| Child Disability Benefit | Up to $248/mo | DTC approved |
| ACSD | Up to $665/mo | Income under $76,920 |
| SSAH | Varies | Application through DSO |

## Last Updated: ${today()}
`;
}

export function generateDocuments(): string {
  return `# Documents

## All Documents

| Date | Title | From | Type | Storage Link |
|------|-------|------|------|-------------|
| (no documents uploaded yet) | | | | |

## Summaries

> Upload documents through the dashboard. Your Navigator will analyze and summarize them.

## Last Updated: ${today()}
`;
}

export function generateJourneyPartners(): string {
  return `# Journey Partners

Last Updated: ${today()}

## Active Team

> No team members added yet. As you connect with providers, they'll appear here.

## Former Team
`;
}

export function generateWaitlistTracker(): string {
  return `# Waitlist Tracker

Last Updated: ${today()}

## Active Waitlists

> No waitlists tracked yet. As your Navigator finds providers and you apply to programs, waitlist positions will be tracked here.

## Resolved

## Agent Monitoring
- Check each active waitlist position monthly
- Alert family 2 weeks before any follow-up date
- Monitor provider websites for capacity changes
- When a provider offers a spot, alert immediately — acceptance windows are short
`;
}

export function generateFormatContracts(): string {
  return `# Format Contracts — Parser Specifications

⚠️ READ THIS FILE before writing to ANY tracked .md file.
The Mission Control dashboard parses these files. Wrong format = broken dashboard.

## General Rules

1. **KV pairs:** Always use \`- **Key:** Value\` (bold key with double asterisks)
2. **Dates:** Always YYYY-MM-DD (ISO 8601)
3. **Tables:** \`| col1 | col2 |\` with header row + \`|---|---|\` separator
4. **Last Updated:** Include \`## Last Updated: YYYY-MM-DD\` or \`Last Updated: YYYY-MM-DD\`
5. **Headings:** Must match exactly (case-insensitive). Do NOT invent new heading names.
6. **Placeholders:** Use \`(none confirmed)\`, \`(to be added)\`, \`(to be assessed)\` — parsers filter these out

---

## child-profile.md

### Required Headings
- \`## Basic Info\` — NOT "Basic Information"
- \`## Personal Profile\` — NOT "About the Child"

### Optional Headings
- \`## Medical Info\` or \`## Medical\`
- \`## Journey Partners\`
- \`## Extra Information\` or \`## Additional ...\`

### KV Format (under Basic Info)
\`\`\`markdown
- **Name:** [Child Name]
- **Date of Birth:** YYYY-MM-DD
- **Age:** [age]
- **Diagnosis:** [diagnosis]
- **Current Stage:** [stage]
- **Postal Code:** [postal code]
- **Location:** [city]
- **Family Language:** [language(s)]
\`\`\`

### Personal Profile Sub-sections (H3)
- \`### Interests\` → bullet list
- \`### Sensory Profile\` → KV: \`Seeks:\`, \`Avoids:\`, \`Calming:\` (comma-separated)
- \`### Communication Style\` → bullet list
- \`### Personality Traits\` → bullet list
- \`### Triggers\` or \`### Triggers & Meltdown Signs\` → bullet list
- \`### Strengths\` → bullet list
- \`### Challenges\` → bullet list

### Medical Sub-sections (H3 under Medical Info)
- \`### Current Medications\` → TABLE: \`medication|dose|frequency|prescriber|start_date|status|notes\`
- \`### Supplements\` → TABLE: \`supplement|dose|frequency|notes\`
- \`### Comorbid Conditions\` → bullet list
- \`### Doctors\` → Format: \`- **Role:** Name — Organization — Phone\`
- \`### Upcoming Appointments\` → Format: \`- YYYY-MM-DD: Description\`

### Journey Partners Table
TABLE: \`role|name|organization|contact|notes\`

---

## alerts.md

### Structure
- \`## Active\` → H3 alert blocks
- \`## Dismissed\` → H3 alert blocks

### Alert Block Format (EXACT)
\`\`\`markdown
### 2026-04-25 | 🔴 HIGH | DTC Application Deadline
Description text here. Can be multiple lines.
**Action:** Call [provider name] at [phone number]
\`\`\`

### Severity Values
- \`🔴 HIGH\` or just \`HIGH\`
- \`🟡 MEDIUM\` or just \`MEDIUM\`
- \`🟢 INFO\` or just \`INFO\`

### Action Line
Must be: \`**Action:** description\`

---

## benefits.md

### Structure
- \`## Application Status\` → TABLE
- \`## Detailed Eligibility\` → H3 blocks per benefit
- \`## Agent Monitoring\` → bullet list

### Application Status Table
\`| Benefit | Status | Applied | Approved | Renewal | Amount | Notes |\`

### Status Keywords (parser recognizes)
- \`renewed\`, \`registered\` or ✅, \`pending\` or ⏳, \`waiting\`, \`approved\`, \`active\`, \`unknown\` or ❓

### Eligibility Block
\`\`\`markdown
### Disability Tax Credit (DTC)
- **Eligibility:** description
- **Amount:** value
- **How Applied:** method
- **Unlocks:** what it enables
- **Documents Needed:** list
- **Status:** current status
- **⚠️ Action:** next step
\`\`\`

---

## providers.md

### Structure
- H3 headings for priority groups:
  - \`### 🔴 Highest Priority Matches\` (contains \`highest priority\`)
  - \`### 🔸 Relevant Community Resources\` (contains \`relevant\` or 🔸)
- H4 headings under each priority group = individual providers

### Provider Block (H4)
\`\`\`markdown
#### [Provider Name]
- **Type:** Public, government-funded
- **Services:** SLP, OT, ABA
- **Relevance:** [why this matches child's needs]
- **Waitlist:** [estimated wait] (unverified)
- **Contact:** [phone] | [website]
- **Funding:** OAP, OHIP
- **Notes:** [relevant notes]
\`\`\`

### Gap Filler Tag
Include \`GAP FILLER\` or 🏷️ in notes to tag as gap filler.

---

## programs.md

### Category Headings (H2)
- \`## 🏷️ Gap Filler Programs\` (contains "gap filler" or 🏷️)
- \`## 📘 Government Programs\` (contains "government" or 📘)
- \`## 📗 Educational Programs\` (contains "educational" or 📗)

### Program Block (H3 under category)
\`\`\`markdown
### Autism Ontario Social Skills Group
- **Type:** Nonprofit program
- **Cost:** Free
- **Ages:** 3-6
- **Schedule:** Saturdays 10am-12pm
- **Location:** London, ON
- **Why Gap Filler:** Provides social interaction while waiting for ABA
- **Register:** Call 519-XXX-XXXX
- **Status:** ✅ Registered
- **URL:** https://...
- **Phone:** 519-...
- **Email:** info@...
\`\`\`

---

## pathway.md

### Structure
- \`## Current Stage: stage-slug\` (H2, slug format)
- \`## Stages\` → H3 stage blocks
- \`## Next Actions\` → numbered list

### Stage Block
\`\`\`markdown
### 1. Initial Concerns [completed]
- [x] Noticed developmental differences
- [x] Spoke with family doctor
\`\`\`

### Status Brackets
- \`[completed]\` → completed
- \`[current]\` → current
- (no bracket) → upcoming

### Item Status Emojis (in checkbox text)
- 🔵 = current focus
- 🔴 or BLOCKED = blocked
- ⭐ or MILESTONE = milestone

### Date in Items
Format: \`- [x] Item text — 2026-04-15\` (at end, after em dash)

---

## journey-partners.md

### Structure
- \`## Active Team\` → H3 blocks per partner
- \`## Former Team\` → H3 blocks per partner

### Partner Block
\`\`\`markdown
### [Provider Name]
- **Role:** [Role]
- **Organization:** [Organization Name]
- **Services:** [service list]
- **Contact:** [phone] | [email]
- **Status:** Active since YYYY-MM-DD
- **Source:** Added via Mission Control, YYYY-MM-DD
\`\`\`

### Last Updated
Both accepted: \`## Last Updated: YYYY-MM-DD\` or bare \`Last Updated: YYYY-MM-DD\`

---

## documents.md

### Structure
- \`## All Documents\` → TABLE: \`date|title|from|type|storage_link\`
- \`## Summaries\` → H3 per document with bullet/numbered findings

---

## waitlist-tracker.md

### Structure
- \`## Active Waitlists\` → H3 blocks per waitlist entry
- \`## Resolved\` → H3 blocks for completed/cancelled waitlists
- \`## Agent Monitoring\` → bullet list of monitoring rules

### Waitlist Entry Block
\`\`\`markdown
### OAP Core Clinical Services
- **Service:** ABA/IBI Therapy
- **Provider:** Ontario Autism Program
- **Applied:** 2025-02-15
- **Position:** Unknown
- **Estimated Wait:** 12-24 months (unverified)
- **Last Checked:** 2026-04-15
- **Next Follow-Up:** 2026-05-15
- **Contact:** AccessOAP portal
- **Notes:** Registration confirmed, waiting for stream assignment
\`\`\`

---

## ontario-system.md

### Structure
- \`## The Journey Overview\` → text or code block
- \`## Ontario Autism Program (OAP)\` → H3 sub-sections:
  - \`### Entry Points\` → numbered/bullet list
  - \`### Childhood Budget\` → list
  - \`### Foundational ...\` → list
  - \`### ... Times\` → TABLE: \`service|wait\`
- \`## School ...\` → H3 sub-sections:
  - \`### IEP\` or \`### Individual Education ...\` → list
  - \`### Board...\` → \`**Name** — Type\` format
- \`## Financial ...\` → TABLE: \`benefit|amount|eligibility\`

---

## employment.md (adolescents only)

### Top-level Fields
\`Last Updated: YYYY-MM-DD\` and \`Status: In Progress\` as bare lines

### Sections
- \`## Employment Profile Snapshot\` → \`Likely Strengths\` / \`Likely Support Needs\` labels
- \`## Employment Goals\` → \`### Near-Term\` / \`### Mid-Term\`
- \`## Recommended Planning Areas\` → numbered H3 titles
- \`## Potential Good-Fit Career Directions\` or \`## Career Hypotheses\` → bullets
- \`## Next Actions\` → numbered list

---

## File Modification Checklist
Before writing to any file:
1. Read this file (format-contracts.md) for the target file's format
2. Use the EXACT heading names listed above
3. Use \`- **Key:** Value\` for all KV pairs
4. Use YYYY-MM-DD for all dates
5. Update the "Last Updated" field
6. Never add new heading names not listed here — the parser won't find them
`;
}

// ── Bundle generator ─────────────────────────────────────────────────────

export interface WorkspaceBundle {
  [filename: string]: string;
}

export function generateWorkspaceBundle(data: OnboardingData): WorkspaceBundle {
  const agentId = `navigator-${data.childName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return {
    "SOUL.md": generateSoul(data.childName, data.language),
    "IDENTITY.md": generateIdentity(agentId, data.childName, data.familyName),
    "USER.md": generateUser(data),
    "AGENTS.md": generateAgents(),
    "memory/child-profile.md": generateChildProfile(data),
    "memory/alerts.md": generateAlerts(),
    "memory/benefits.md": generateBenefits(),
    "memory/providers.md": generateProviders(),
    "memory/programs.md": generatePrograms(),
    "memory/pathway.md": generatePathway(data.childName, data.stage),
    "memory/ontario-system.md": generateOntarioSystem(),
    "memory/documents.md": generateDocuments(),
    "memory/journey-partners.md": generateJourneyPartners(),
    "memory/waitlist-tracker.md": generateWaitlistTracker(),
    "memory/format-contracts.md": generateFormatContracts(),
  };
}
