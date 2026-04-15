# Hybrid Architecture — Full Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish single source of truth for every entity. Structured data → Supabase. Narrative data → workspace .md. No more duplication across files. No more localStorage tracking. Agent writes via tools, not format contracts.

**Architecture:** Each entity has ONE authoritative source. Junction tables link families to catalog items with `agent_note` for personalized context. Dashboard reads exclusively from Supabase for structured data, from workspace .md for narrative only.

**Tech Stack:** Supabase (PostgreSQL + RLS + Realtime), React Query, Next.js API routes, Vitest, OpenClaw MCP tools

---

## The Pattern (applies to EVERY structured entity)

```
Agent DISCOVERS → Supabase catalog table (row)
Agent RECOMMENDS → Supabase family_* junction table (row + agent_note)
Family ACTS → Supabase junction UPDATE (status change)
Agent NARRATES → Workspace .md (pathway, profile — the story)
```

---

## Data Ownership Map

### Supabase = Source of Truth

| Table | Purpose | Who writes | Dashboard reads |
|-------|---------|-----------|----------------|
| `family_alerts` | Deadlines, reminders, actions | Agent (tool) + Dashboard | `/api/alerts` |
| `family_team_members` | Care team (replaces journey-partners.md + stakeholder_links merge) | Agent + Dashboard (consolidate) | `/api/journey-partners` |
| `family_benefits` | Benefit applications + status tracking | Agent + Dashboard | `/api/benefits` |
| `family_programs` | Enrolled/recommended programs | Agent + Dashboard | `/api/programs/family` |
| `providers` | Provider catalog (public) | Provider Portal + Agent scraping | `/api/providers/*` |
| `programs` | Program catalog (public) | Admin + Agent | `/api/programs/search` |

### Workspace .md = Source of Truth (narrative only)

| File | Purpose | Who writes | Dashboard reads |
|------|---------|-----------|----------------|
| `child-profile.md` | Personality, sensory, communication, strengths, challenges | Agent | Parser (profile.ts) |
| `pathway.md` | Family journey story, stages, milestones | Agent | Parser (pathway.ts) |
| `ontario-system.md` | Reference: how Ontario services work | Agent | Parser |
| `waitlist-tracker.md` | Agent's internal tracking (feeds alerts) | Agent | Never (internal) |
| `format-contracts.md` | Agent's parser reference | Never | Never (internal) |

### ELIMINATED (no longer needed)

| Former source | Replaced by |
|--------------|-------------|
| `alerts.md` | `family_alerts` table |
| `journey-partners.md` | `family_team_members` table |
| `benefits.md` status table | `family_benefits` table |
| `benefits.md` eligibility details | `family_benefits.eligibility_detail` (text field) |
| `programs.md` enrolled programs | `family_programs` junction |
| `providers.md` "my providers" | `family_team_members` (providers are team members) |
| `providers.md` recommendations | `family_providers` junction with agent_note |
| `documents.md` | Already in Supabase `documents` table |
| localStorage alert tracking | `family_alerts.status` + `completed_at` |
| localStorage benefit tracking | `family_benefits` fields |
| localStorage profile edits | Future: `family_profile_edits` or agent sync |
| child-profile.md Doctors section | `family_team_members` (role = doctor) |
| child-profile.md Journey Partners table | `family_team_members` |

---

## Reconciliation Decisions

### 1. People: Merge stakeholder_links INTO family_team_members

Today: Dana William appears in `journey-partners.md` + `stakeholder_links` + `child-profile.md` Doctors.

After: ONE row in `family_team_members` with all fields:

```sql
family_team_members:
  id, family_id, agent_id, child_name,
  name, role, organization, services,
  phone, email, website,              -- normalized contacts (not "5196979760 | dana@email.com")
  status ('active'|'former'|'pending'|'declined'),  -- merges both status systems
  stakeholder_user_id (FK → auth.users, nullable),  -- if they have a Supabase account
  permissions JSONB,                   -- from stakeholder_links
  invite_token TEXT,                   -- from invite system
  started_at, removed_at, removed_reason,
  source, agent_note,
  created_at, updated_at
```

Stakeholder-specific logic (portal access, document sharing) uses `stakeholder_user_id` to check if person has an account. No separate table needed.

### 2. Benefits: Single table with structured + narrative

```sql
family_benefits:
  id, family_id, agent_id,
  benefit_name TEXT,                   -- "Disability Tax Credit (DTC)"
  status ('not_started'|'pending'|'approved'|'denied'|'active'|'renewed'),
  applied_date DATE,
  approved_date DATE,
  renewal_date DATE,
  amount TEXT,
  -- Narrative fields (agent writes freely):
  eligibility_detail TEXT,             -- replaces benefits.md Detailed Eligibility section
  action TEXT,                         -- "Call CRA at 1-800..."
  documents_needed TEXT,
  agent_note TEXT,                     -- "Applied via AccessOAP, confirmation #12345"
  created_at, updated_at
```

### 3. Programs: Catalog + Family junction

```sql
-- Catalog (shared across all families)
programs:
  id, name, category, type, cost, ages, schedule, location,
  contact, phone, email, website,
  description TEXT,
  is_gap_filler BOOLEAN,
  source TEXT,  -- "agent_search", "admin", "community"
  created_at, updated_at

-- Family-specific (per family)
family_programs:
  id, family_id, program_id (FK → programs),
  agent_id TEXT,
  status ('recommended'|'applied'|'enrolled'|'completed'|'dropped'),
  agent_note TEXT,   -- "Gap filler while waiting for ABA. Alex needs social interaction."
  enrolled_at DATE,
  created_at, updated_at
```

### 4. Providers: Already in Supabase, add family junction

```sql
-- Catalog already exists: providers table

-- Family-specific recommendations
family_providers:
  id, family_id, provider_id (FK → providers),
  agent_id TEXT,
  priority ('highest'|'relevant'|'other'),
  status ('recommended'|'contacted'|'waitlisted'|'active'|'declined'),
  agent_note TEXT,   -- "Matches Alex's sensory needs. Short waitlist."
  is_gap_filler BOOLEAN,
  created_at, updated_at
```

When a family **accepts** a provider → also INSERT into `family_team_members` (they become care team).

### 5. Alerts: Absorb localStorage tracking

```sql
family_alerts:
  id, family_id, agent_id, child_name,
  date DATE, severity, title, description, action,
  status ('active'|'dismissed'|'completed'),  -- replaces localStorage
  completed_at TIMESTAMPTZ,                    -- replaces localStorage
  notes TEXT[],                                -- replaces localStorage
  source TEXT,  -- 'agent', 'system', 'migrated'
  related_entity_type TEXT,  -- 'benefit', 'provider', 'program' (optional link)
  related_entity_id UUID,   -- FK to the related table (optional)
  created_at, updated_at
```

`related_entity_type` + `related_entity_id` = the link between "DTC Response Overdue" alert and the DTC benefit row. No more matching by name.

---

## Phased Execution

### Phase 1A: Foundation (DB schema + query layer)
1. Create all 5 new tables (family_alerts, family_team_members, family_benefits, family_programs, family_providers)
2. Write query functions + tests for each (TDD)
3. Write API routes for each
4. Write React Query hooks

### Phase 1B: Migration + Frontend Switch
5. Seed scripts: migrate existing .md data → DB
6. Switch alerts page to DB (with .md fallback)
7. Switch journey partners / settings to DB
8. Remove localStorage tracking from alerts + benefits pages
9. Update consolidation route → DB writes

### Phase 1C: Agent Tools
10. Create OpenClaw MCP server or skills that give agent Supabase access
11. Update AGENTS.md with new tool instructions (write to DB, not .md)
12. Test agent flow: agent creates alert via tool → dashboard shows it

### Phase 2: Cleanup
13. Remove unused parsers (alerts, journey-partners, benefits status, providers priority)
14. Remove consolidation route .md writing logic
15. Update CLAUDE.md, format-contracts.md
16. Update workspace templates (onboarding creates junction rows, not .md content)

---

## Files to Create

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260415_hybrid_schema.sql` | All 5 tables + RLS + triggers |
| `src/lib/supabase/queries/alerts.ts` | CRUD for family_alerts |
| `src/lib/supabase/queries/team-members.ts` | CRUD for family_team_members |
| `src/lib/supabase/queries/benefits.ts` | CRUD for family_benefits |
| `src/lib/supabase/queries/family-programs.ts` | CRUD for family_programs |
| `src/lib/supabase/queries/family-providers.ts` | CRUD for family_providers |
| `src/lib/supabase/queries/*.test.ts` | Tests for each query module |
| `src/hooks/useAlerts.ts` | React Query hook (DB-backed) |
| `src/hooks/useJourneyPartners.ts` | React Query hook (DB-backed) |
| `src/hooks/useBenefits.ts` | React Query hook (DB-backed) |
| `src/app/api/alerts/route.ts` | GET + PATCH alerts |
| `src/app/api/journey-partners/route.ts` | GET team members |
| `src/app/api/benefits/status/route.ts` | GET + PATCH benefit status |
| `scripts/seed-to-db.mjs` | One-time migration from .md → DB |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(authenticated)/alerts/page.tsx` | DB-first, remove localStorage |
| `src/app/(authenticated)/benefits/page.tsx` | DB-first for status, remove localStorage |
| `src/app/(authenticated)/settings/page.tsx` | Read from family_team_members instead of stakeholder_links + journey-partners.md |
| `src/app/api/consolidate/route.ts` | Write to DB tables instead of .md files |
| `src/app/api/care-team/invite/route.ts` | Write to family_team_members instead of stakeholder_links |
| `src/hooks/useWorkspace.ts` | Remove hooks for migrated entities |
| `CLAUDE.md` | Document hybrid architecture |

## Files Kept (narrative parsers)

| File | Why kept |
|------|---------|
| `src/lib/workspace/parsers/profile.ts` | Child profile stays .md (narrative) |
| `src/lib/workspace/parsers/pathway.ts` | Pathway stays .md (narrative) |
| `src/lib/workspace/parsers/ontario-system.ts` | Reference material stays .md |
| `src/lib/workspace/parsers/employment.ts` | Adolescent narrative stays .md |
| `src/lib/workspace/parsers/university.ts` | Adolescent narrative stays .md |
| `src/lib/workspace/parsers/documents.ts` | Summaries stay .md (actual docs in Supabase) |

## Files to Eventually Remove (after migration verified)

| File | Replaced by |
|------|------------|
| `src/lib/workspace/parsers/alerts.ts` | `family_alerts` table |
| `src/lib/workspace/parsers/journey-partners.ts` | `family_team_members` table |
| `src/lib/workspace/parsers/benefits.ts` | `family_benefits` table |
| `src/lib/workspace/parsers/providers.ts` | `family_providers` + `providers` tables |
| `src/lib/workspace/parsers/programs.ts` | `family_programs` + `programs` tables |

---

## Verification Checklist

- [ ] All 5 tables created with RLS policies
- [ ] `npm test` passes (new query tests + existing narrative parser tests)
- [ ] `npm run build` clean
- [ ] Alerts page reads from DB, dismiss/complete persists in DB (not localStorage)
- [ ] Settings page reads team from DB (unified — no more stakeholder_links + workspace merge)
- [ ] Benefits page status from DB (not localStorage tracking)
- [ ] Seed script migrates existing .md data successfully
- [ ] Agent can write alerts via OpenClaw tool → dashboard shows them
- [ ] Same person (Dana) appears consistently across all pages with ONE email
- [ ] Consolidate route writes to DB, not .md
- [ ] CLAUDE.md documents the hybrid architecture
