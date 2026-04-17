# Doctor Portal — WhatsApp-Style Multi-Patient Experience

**Date:** 2026-04-17
**Status:** Approved — ready for implementation plan

## Context

Dr. da Silva logged into the Care Team Portal at `/team` and saw:
- A generic "Child" with "N/A" age and "Information not available" for diagnosis (no patient data)
- A single hardcoded "Family Family" as the only message recipient

The portal was built assuming one stakeholder = one family = one child. In reality, a doctor can be linked to multiple patients across multiple families. The existing schema (`stakeholder_links.child_agent_id`, `messages.child_agent_id`, `family_team_members`) already supports per-patient scoping — but the `/team` UI and APIs don't use it.

Goal: transform `/team` into a WhatsApp-style portal where each patient is a row on the left, and selecting a patient shows that patient's profile, documents, and scoped messages on the right.

## User Story

**Dr. da Silva signs in** and sees:
- A left sidebar listing all her patients (Alex Santos, Sofia Santos, Daniel Liboni) with unread counts and last-message previews
- Clicking Sofia shows Sofia's overview (name, age, diagnosis), documents, and a chat panel scoped to Sofia only
- She can message Sofia's family OR another provider on Sofia's care team (e.g. Sofia's OT)
- Messages she sends are tagged with `child_agent_id = sofia-navigator` so the family sees them filtered per-child

## Architecture

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ 🤝 Care Team Portal       Dr. da Silva · Sign Out      │
├─────────┬───────────────────────────────────────────────┤
│ PATIENTS│  [Selected patient pane]                      │
│ ─────── │                                                │
│ ● Sofia │  ┌─ Child Overview ──────────────────────┐   │
│   Santos│  │ Name / Age / Diagnosis                │   │
│   2 new │  └───────────────────────────────────────┘   │
│         │  ┌─ Documents ──────────────────────────┐   │
│ • Alex  │  │ Upload + list                        │   │
│   Santos│  └───────────────────────────────────────┘   │
│         │  ┌─ Messages (for Sofia) ──────────────┐   │
│ • Daniel│  │ Threads scoped to Sofia              │   │
│   Liboni│  └───────────────────────────────────────┘   │
└─────────┴───────────────────────────────────────────────┘
```

The sidebar always renders (even with one patient) for layout consistency.

### Data Model — what already exists

No schema changes. Reuse:

| Table | Column | Purpose |
|-------|--------|---------|
| `stakeholder_links` | `child_agent_id`, `child_name` | Links doctor to a specific child within a family |
| `messages` | `child_agent_id` | Per-child message scoping |
| `family_team_members` | `agent_id`, `child_name` | Other care team members for a patient |

A "patient" is uniquely identified by `{family_id, child_agent_id}` — one row in `stakeholder_links`.

## Components & Data Flow

### 1. New: `PatientList` component

**Location:** `src/app/(team)/team/components/PatientList.tsx`

Renders a vertical list of patient rows. Props:
- `patients: PatientRow[]`
- `selectedId: string` (link_id)
- `onSelect: (id: string) => void`

Each row shows:
- Child name (bold)
- Family name (subtitle)
- Unread count badge (if > 0)
- Last message preview (truncated, 1 line)
- Selected state (terracotta left border + light background)

Data source: new API endpoint `GET /api/team/patients` (see below).

### 2. Updated: `/api/team/patients` (NEW)

**Location:** `src/app/api/team/patients/route.ts`

```typescript
// GET /api/team/patients
// Returns: PatientRow[]
interface PatientRow {
  linkId: string;          // stakeholder_links.id
  familyId: string;
  childAgentId: string;
  childName: string;
  familyName: string;
  unreadCount: number;     // messages where recipient_id = me AND read_at IS NULL AND child_agent_id = X
  lastMessage: {           // most recent message for this patient
    content: string;
    createdAt: string;
  } | null;
}
```

Logic:
1. `stakeholder_links` where `stakeholder_id = user.id` AND `status IN ('accepted', NULL)`
2. For each link → resolve family name (from auth metadata) + unread count (messages query) + last message
3. Return array

### 3. Updated: `/api/team/profile`

**Change:** accept `?patient=<linkId>` query param.

- Resolve link → `{family_id, child_agent_id}`
- Read that child's `child-profile.md` from the family's workspace
- Return a single `FamilyInfo` for the selected patient (remove `families[]` array)

If `patient` param missing → pick first linked patient by default.

### 4. Updated: `/api/team/messages`

**Change:** accept `?patient=<linkId>` query param.

- Resolve link → `{family_id, child_agent_id}`
- Filter `messages.child_agent_id = X` AND `messages.family_id = Y`
- Group by `thread_id`, return threads as before
- `deleted_at IS NULL` filter preserved

### 5. Updated: `/api/team/contacts` (replaces hardcoded "Family")

**Change:** return real care team members scoped to the selected patient.

- Query `family_team_members` where `family_id = X` AND (`child_name = Y` OR `child_name IS NULL`)
- Plus one synthetic "Family" entry (representing the parent) at the top
- Each contact is a possible message recipient

### 6. Updated: `/team` page (`src/app/(team)/team/page.tsx`)

**State changes:**
- Add `selectedPatientId: string` state (lifted to page)
- Pass `selectedPatientId` to all three sections (profile, docs, messages)
- All three sections refetch when `selectedPatientId` changes

**Layout changes:**
- Grid: left column `[280px]`, right column `[1fr]`
- Left column renders `<PatientList />` with selection state
- Right column contains existing profile/documents/messages sections

**Message send:**
- When sending a message, include `child_agent_id` from the selected patient
- API route `/api/messages/send` already accepts `child_agent_id` (confirmed from earlier session)

### 7. Thread header shows patient name

In the messages thread view, prepend the subject with `[For: ${childName}]` so the doctor always sees which patient the conversation concerns. Cosmetic-only change.

### 8. Documents — per-patient scoping, source visibility, permissions, RAG, delete rules

The documents infrastructure mostly exists (`documents`, `document_permissions`, `DocumentSharingPopover`, `/api/documents/analyze`) but has gaps. Fix them:

#### 8a. Doctor uploads tagged per-patient

`/api/team/documents` POST currently stores docs with `family_id` only — no child reference. When Dr. Silva uploads for Sofia, the family's documents page has no way to filter it to Sofia.

**Change:** upload endpoint accepts `?patient=<linkId>` (same scheme as the rest of the portal). Resolve link → `{family_id, child_agent_id, child_name}`. Set both `child_agent_id` and `child_name` on the row.

**Schema note:** `documents` table currently has `child_name` + `child_nickname` but not `child_agent_id`. Add a migration: `ALTER TABLE documents ADD COLUMN child_agent_id TEXT;` + index on `(family_id, child_agent_id)`.

#### 8b. Doctor portal shows only selected patient's docs

`/api/team/documents` GET currently returns all docs for all linked families. Accept `?patient=<linkId>` and filter by `{family_id, child_agent_id}`. Keep RLS: still respect `uploaded_by = me OR document_permissions.can_view = true`.

#### 8c. Family documents page — surface the uploader name

`getUploaderLabel()` hardcodes "Dr. Park". Replace with a lookup: join documents with `family_team_members` on `uploaded_by = stakeholder_user_id` to get the real name. Fallback: show `uploader_role` (e.g. "Doctor") if no match.

**UI:** each doc card shows "Uploaded by: Dr. da Silva" (not just role).

#### 8d. Per-document permissions — confirm working for stakeholder-uploaded docs

`DocumentSharingPopover` exists and writes to `document_permissions`. Verify it shows up for docs uploaded by doctors too (the family still owns them and must be able to share/hide them from other stakeholders). No code changes expected if the popover is already rendered on every doc detail row — just verify in testing.

**New rule:** when a stakeholder uploads a document, auto-insert a `document_permissions` row granting that stakeholder `can_view = true` on their own upload (so they see their own upload in their list even if family doesn't share it manually).

#### 8e. Delete rules — uploader only

No DELETE endpoint exists today. Add `DELETE /api/documents/[id]`:

- Parent can delete any document where `uploaded_by = auth.uid()`
- Stakeholder can delete any document where `uploaded_by = auth.uid()`
- Neither can delete documents uploaded by others (RLS enforces this)
- On delete: remove storage file, delete row, cascade `document_permissions` rows

RLS policy: `FOR DELETE USING (uploaded_by = auth.uid())`.

**UI:** add a delete button (trash icon) on documents where `doc.uploaded_by === currentUserId`. Hide it on others' uploads.

#### 8f. Chat bubble RAG — document awareness

Current state: `ChatPanel` → `/api/chat` sends general messages with no document context. `/api/documents/analyze` is a separate per-doc flow triggered from the documents page.

**v1 approach (lightweight, scoped to current child):**
When the parent opens the chat bubble, the chat endpoint injects a compact document manifest into the system prompt — for the currently active child:

```
Documents on file for Sofia:
1. IEP 2026 (school, uploaded 2026-03-10 by Alex Santos School Board) — id: abc
2. ADOS-2 Assessment (assessment, uploaded 2026-01-15 by Dr. da Silva) — id: def
```

The agent knows docs exist and can answer "what does Sofia's IEP say about math supports?" by calling the existing `/api/documents/analyze` endpoint via a tool call — OR, for simplicity in v1, the chat route pre-fetches extracted text from the most recently referenced doc on demand when the user's message mentions a document by title.

**v1 scope — minimal change:**
- `/api/chat` (or wherever chat is wired) fetches documents scoped to active child
- Injects the manifest (titles + types + dates + IDs) into the system prompt
- Agent can reference documents by name in replies
- If the user asks deeper questions, the existing "Ask Navigator" from the document detail page is still the full-RAG path
- Do NOT wire up agent tool calls yet — defer to future iteration

This gets ~80% of the user benefit for ~20% of the work. Full RAG with vector search is out of scope for this spec.

### 9. Email notification on doctor → family messages

Mirror the existing parent → doctor flow (`/api/messages/send` uses `sendMessageNotificationEmail` fire-and-forget). Extend `/api/team/messages` POST so that after a successful insert:

- Look up the family's email from `auth.admin.getUserById(familyId)`
- Resolve child name from `stakeholder_links` (the link that matches `{family_id, stakeholder_id}`)
- Fire-and-forget `sendMessageNotificationEmail({ to: familyEmail, senderName: <doctor name>, childName })`
- Errors swallowed silently (best-effort, same pattern as parent → doctor)

No new email template needed — the existing `sendMessageNotificationEmail` in `src/lib/email.ts` covers both directions. The "senderName" field naturally reads as the doctor's name when the doctor is sending.

## Error Handling

- **Zero patients:** empty sidebar with "No patients linked yet. Ask a family to invite you."
- **Profile read fails (workspace offline):** show overview card with "Profile temporarily unavailable" — don't break the whole page
- **Messages API fails:** show toast, empty state with retry button
- **Unread count query fails:** silently fall back to 0 (non-critical)

## Testing

**Manual end-to-end:**
1. Sign in as Dr. da Silva (luisa.liboni.ai+silva@gmail.com)
2. Verify sidebar lists her linked patients
3. Click a patient → overview shows correct child data (read from that child's `child-profile.md`)
4. Messages section shows only threads scoped to that patient
5. Send a message → verify `messages.child_agent_id` is set correctly in DB
6. Switch to parent account → open messages with `?agent=<same-child>` → message appears in that child's inbox
7. Switch to a different patient → overview + messages refresh to new patient's data

**Automated:** none — UI changes and API plumbing. Existing `__tests__/` cover parsers and DB queries; no new pure-logic code added.

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/(team)/team/components/PatientList.tsx` | Sidebar component |
| `src/app/api/team/patients/route.ts` | GET list of linked patients with unread + last message |
| `src/app/api/team/contacts/route.ts` | GET care team contacts for a selected patient |
| `src/app/api/documents/[id]/route.ts` | DELETE endpoint (uploader only) |
| `supabase/migrations/20260417_documents_child_agent.sql` | Add `child_agent_id` column + index to `documents` |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(team)/team/page.tsx` | Add selectedPatientId state, two-column layout, wire PatientList. Replace inline `fetchTeamContacts` with call to new `/api/team/contacts` endpoint. Pass `patient` to DocumentsSection. |
| `src/app/api/team/profile/route.ts` | Accept `?patient=`, return single FamilyInfo |
| `src/app/api/team/messages/route.ts` | Accept `?patient=` in GET, filter by `child_agent_id`. In POST, set `child_agent_id` on insert and fire-and-forget `sendMessageNotificationEmail` to family. |
| `src/app/api/team/documents/route.ts` | Accept `?patient=` in GET + POST. Tag uploads with `child_agent_id` + `child_name`. Auto-insert self-grant in `document_permissions`. |
| `src/app/(authenticated)/documents/page.tsx` | Replace hardcoded `getUploaderLabel` with real name lookup from `family_team_members`. Add delete button when `doc.uploaded_by === currentUserId`. |
| `src/app/api/chat/route.ts` (or equivalent) | Fetch active-child documents manifest and inject into system prompt. |

## Out of Scope

- Real-time message updates (keep 30s polling)
- Push notifications on new message
- Mobile-responsive redesign of the two-column layout (desktop-first for v1)
- Multi-family switcher UI beyond one flat patient list (flat list is sufficient)
- Full RAG with vector search / embedding-based document retrieval (v1 uses compact manifest in system prompt)
- Agent tool-calling to fetch document text on demand (defer to future — v1 relies on document manifest + existing "Ask Navigator" per-doc path)
- Document versioning / re-uploads (new upload is a new row)
- Bulk document permission changes (per-doc toggle only, v1)

## Verification Checklist

- [ ] Dr. da Silva sees all her patients in the sidebar (≥ 2 linked → ≥ 2 rows)
- [ ] Selecting a patient updates profile + messages to that patient's data
- [ ] Unread badge count matches actual unread messages for that patient
- [ ] Messages sent by doctor include correct `child_agent_id` in DB
- [ ] Parent's inbox (filtered per-child) receives doctor's message on the correct child
- [ ] Thread headers show `[For: <childName>]`
- [ ] Empty state renders correctly when no patients linked
- [ ] Family receives an email when doctor sends a message (check Resend logs + inbox)
- [ ] Doctor uploads a document for Sofia → parent's documents page shows it under Sofia filter
- [ ] Document card shows real uploader name ("Dr. da Silva") not a role or hardcoded string
- [ ] Parent can toggle per-doc sharing for doctor-uploaded docs (sharing popover works)
- [ ] Delete button appears only on documents the current user uploaded
- [ ] Deleting another user's document returns 403
- [ ] Chat bubble can reference documents by name ("IEP 2026 shows...") for active child
- [ ] `npm run build` clean, `npm test` 388/388
- [ ] `npm run build` clean
- [ ] `npm test` 388/388 passes (no regressions)
