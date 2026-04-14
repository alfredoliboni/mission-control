# Mission Control — The Companion

@AGENTS.md

## What This Is

Family-facing dashboard for navigating Ontario's autism services. Each family gets a personal AI agent (OpenClaw Navigator) that runs 24/7 on an Orgo.ai VM. The agent researches services, monitors deadlines, finds providers, and prepares recommendations. This dashboard is the family's window into everything the agent has found — they review, approve, and chat with the agent here.

## Architecture: Agent-First, Workspace as Source of Truth

```
FAMILY (low-tech parents)
    |  simple, visual interface
MISSION CONTROL (this Next.js app on Vercel)
    |  reads workspace .md files via Gateway API
    |  reads Supabase for auth, uploads, messages
OPENCLAW AGENT (1 per family, on Orgo.ai VM)
    |  writes memory/*.md files (providers, alerts, benefits, etc.)
    |  proactive: heartbeats every 2-4h, searches, monitors
    |  responds to chat via Gateway API
SUPABASE (minimal — NOT for agent content)
    |  auth (email/password, roles)
    |  document storage (PDFs, assessments uploaded by doctors/schools)
    |  inter-stakeholder messages
    |  provider profiles (B2B registrations)
```

### What lives where

| Data | Source | Why |
|------|--------|-----|
| Providers, programs, benefits, pathway, alerts | Workspace `.md` → Gateway API | Agent curates and updates |
| Child profile, ontario-system reference | Workspace `.md` → Gateway API | Agent maintains |
| Uploaded documents (PDFs, assessments) | Supabase Storage | Multi-party uploads |
| Messages between stakeholders | Supabase `messages` table | Real-time multi-party |
| User authentication & sessions | Supabase Auth | Standard auth flow |
| Provider registrations (B2B) | Supabase `provider_profiles` | Providers self-register |
| Chat with Navigator agent | OpenClaw Gateway API (port 18789) | Direct agent conversation |

### Data modes
- **Dev:** Local filesystem via `WORKSPACE_MEMORY_PATH` env var
- **Production:** OpenClaw Gateway API on Orgo.ai VM, authenticated with bearer token

## Stakeholders & Portals

| Who | Role | How they access |
|-----|------|-----------------|
| **Families/Parents** | Primary users | Mission Control dashboard (free) |
| **Service Providers** (OTs, ABA, clinics) | Register in database | Provider Portal (paid subscription) |
| **Doctors** | Invited by family | Care Team access — upload docs, view profile |
| **Schools** | Invited by family | Care Team access — upload IEPs, reports |
| **Employers** (for adolescents) | Register | Provider Portal (employment section) |
| **Universities** (for adolescents) | Register | Provider Portal (transition section) |

## Business Model

- Families: **FREE** (government buys bulk licenses)
- Providers: **Subscription** ($29-99/month) for verified profile, real-time waitlist, analytics
- Government: Bulk license contracts (e.g., Ontario buys 10,000 licenses for OAP families)
- Scraped/public providers still show — verified providers get badge + priority ranking

## Agent Details (Orgo.ai)

- 5 test families deployed: Santos, Chen, Okafor, Tremblay, Rivera
- 6 navigators total (incl. Sofia Santos)
- Each has own workspace with: SOUL.md, AGENTS.md, USER.md, memory/*.md
- Model: Claude Sonnet 4.6 (fallback Haiku)
- Heartbeat: configured via OpenClaw cron (6 navigators, every 3h)
- Gateway port: 18789, token auth, Tailscale for secure access
- Agent is headless (no Discord) — writes to workspace, dashboard reads

## Stage-Specific Sections

The agent creates additional `.md` files based on the child's age/stage:
- **Adolescents (14+):** `employment.md` (job matching), `university.md` (program ranking by accommodation fit)
- **Early childhood:** `gap-fillers.md` (interim programs while waiting for OAP)
- **Transition:** `transition-plan.md` (ODSP, adult services)

The sidebar discovers these dynamically via `discoverSections()`.

## Key Directories

- `src/lib/workspace/parsers/` — Markdown parsers (the heart of the app)
- `src/hooks/useWorkspace.ts` — Data fetching hooks (workspace-live API)
- `src/components/sections/` — Feature-specific UI components
- `src/components/layout/` — AppShell, Sidebar, TopBar
- `src/components/chat/` — ChatBubble, ChatPanel, ChatMessage
- `src/app/(authenticated)/` — Protected route pages
- `src/app/api/` — API routes (workspace-live, chat, companion proxy)
- `src/lib/supabase/` — Supabase clients (browser, server, middleware)
- `src/lib/workspace/parsers/__fixtures__/demo-data/` — Test fixture markdown files

## Commands

- `npm run dev` — Start dev server
- `npm test` — Run all tests (vitest, 299 tests)
- `npm run test:watch` — Tests in watch mode
- `npm run build` — Production build
- `npm run lint` — ESLint

## Stack

- Next.js 16 + React 19 (BREAKING CHANGES — read `node_modules/next/dist/docs/`)
- @base-ui/react (headless components, NOT classic shadcn)
- Tailwind CSS v4 (`@theme inline` syntax)
- React Query + Zustand + Supabase (@supabase/ssr)
- Vitest for testing

## Design System

- Cream Balance aesthetic (warm minimalism)
- DM Sans throughout (400/500/600/700 weights for hierarchy)
- Emojis as section icons (playful but controlled)
- Terracotta primary (`#c96442`), cream background (`#faf9f6`)
- Status colors: green (success), blue (current), red (blocked), gold (caution), purple (gap filler), teal (renewed)
- CSS variables in `src/app/globals.css` drive the entire color system
- Cards with hover lift, gradient avatar, severity dots (not heavy badges)

## Format Contract

The agent's markdown format is a machine-readable contract.
Each parser expects specific heading names, table columns, and KV formats.
See `PRD.md` section 3 for the full specification.
Format drift breaks parsers — always test after changing parser logic.

## Current State (April 2026)

### Working (April 13, 2026)

**Core:**
- Frontend v2 (Cream Balance design, DM Sans, emojis, 65+ routes)
- 299 vitest tests passing (14 test files, 10 parsers)
- Supabase Auth (sign in/up, password reset, session validation, password visibility toggle)
- 5 family accounts + 6 agents on Orgo.ai VM (incl. Sofia Santos)
- Chat bubble → OpenClaw Gateway (Claude Sonnet 4.6, base64 encoding, 60s timeout)
- Error boundaries + loading states + mobile polish (44px touch targets, dvh)
- Deploy on Vercel — production live, all env vars configured
- RLS policies applied for production security (10 security bugs fixed)
- Resend domain verified for transactional email

**Dashboard & Sections:**
- Dashboard with welcome card, metrics, stage progress, alerts
- Calendar: visualize appointments, deadlines, and agent-discovered events
- Profile with "🎯 Priority Needs" card (extracted from child data)
- Pathway with stages, checkmarks, next actions
- Providers: three tabs (my providers + recommended + search all), interactive Leaflet map, enrichment from Supabase, "Why?" explanations, Priority Now banner with child-specific needs, fuzzy search (trigram similarity), provider view tracking
- Programs: two tabs, gap filler explanations, enrichment, Priority Now banner
- Benefits: 3-column Kanban (Recommended → Applied → Result), status tracking
- Alerts: severity dots, undo/reactivate
- Ontario System: visual vertical timeline with hover details
- Employment + University: parsers + structured pages (adolescent)

**Document Vault:**
- Two-panel layout (list + detail)
- Upload drag-and-drop → Supabase Storage
- Per-document sharing toggles (Supabase document_permissions)
- RAG: PDF text extraction (PyPDF2 on VM) → Navigator analysis
- Share Packet: select docs → browser print → PDF export
- Child filter for multi-child families
- "Ask Navigator" / "Get Summary" with inline results

**Messaging:**
- Real threads with Supabase persistence
- Real contacts (names from stakeholder_links, not generic roles)
- Family ↔ stakeholder communication
- Navigator thread from workspace messages.md

**Community:**
- Forum on Supabase (posts, comments, upvotes)
- 6 categories, search, sort, pinned posts
- Anonymous posting (default)

**Portals:**
- Provider Portal (/portal/register — public registration)
- Employer Portal (/portal/employer — supported employment)
- University Portal (/portal/university — accommodations)
- Provider Dashboard (/portal/dashboard — authenticated, edit profile, real view count stats, My Families)
- Care Team Portal (/team — limited view for doctors/schools)

**Multi-child:**
- Santos family: Alex (4yo) + Sofia (8yo, ASD L1 + ADHD)
- Child switcher dropdown in TopBar
- Per-child workspace routing (?agent= param)
- Per-child stakeholder invites (child_name in stakeholder_links)

**Invite System:**
- Accept/decline flow (/invite/[id] public page)
- Status tracking: pending → accepted/declined
- Email notification via Resend (optional, graceful without API key)
- Settings shows status badges (green/yellow/red)

**Auth:**
- Password reset flow (forgot → email → update)
- Multi-role: parent, stakeholder, provider
- Stakeholders auto-redirect to Care Team Portal

### Pending

**High Priority:**
- **Provider architecture change** — providers.md should be "My Providers" (confirmed/active), Supabase providers table should be the match source. "Your Matches" reads from DB, not workspace

**Medium Priority:**
- **PWA** — installable on mobile (manifest.json + service worker)
- **Monitoring/logging** — Sentry or similar for production

**Low Priority / Future:**
- Agent reads uploaded documents permanently (copies to workspace)
- 211 Ontario API integration
- Stripe billing for provider subscriptions
- Real-time WebSocket for messages (currently polling)

## Rules

- Never use a database for agent-produced content — workspace `.md` is source of truth
- All parsers must have corresponding test files
- Test fixture data in `src/lib/workspace/parsers/__fixtures__/demo-data/` must stay in sync with parser expectations
- CSS variables in `globals.css` drive the entire color system
- Run `npm test` before committing parser changes
- The agent is the product, the dashboard is the window
- Claude Code is the primary development tool (not Alfredo/OpenClaw)
