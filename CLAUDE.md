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
- **Demo:** Static `.md` files in `public/demo-data/` — no agent, no auth needed
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
- Each has own workspace with: SOUL.md, AGENTS.md, USER.md, memory/*.md
- Model: Claude Sonnet 4.6 (fallback Haiku)
- Heartbeat: every 2-4 hours
- Gateway port: 18789, token auth
- Agent is headless (no Discord) — writes to workspace, dashboard reads

## Stage-Specific Sections

The agent creates additional `.md` files based on the child's age/stage:
- **Adolescents (14+):** `employment.md` (job matching), `university.md` (program ranking by accommodation fit)
- **Early childhood:** `gap-fillers.md` (interim programs while waiting for OAP)
- **Transition:** `transition-plan.md` (ODSP, adult services)

The sidebar discovers these dynamically via `discoverSections()`.

## Key Directories

- `src/lib/workspace/parsers/` — Markdown parsers (the heart of the app)
- `src/hooks/useWorkspace.ts` — Data fetching hooks (dual-mode demo/live)
- `src/components/sections/` — Feature-specific UI components
- `src/components/layout/` — AppShell, Sidebar, TopBar, DemoBanner
- `src/components/chat/` — ChatBubble, ChatPanel, ChatMessage
- `src/app/(authenticated)/` — Protected route pages
- `src/app/api/` — API routes (workspace, chat, companion proxy, demo)
- `src/lib/supabase/` — Supabase clients (browser, server, middleware)
- `public/demo-data/` — Demo markdown files (also used as test fixtures)

## Commands

- `npm run dev` — Start dev server
- `npm test` — Run all tests (vitest, 239 tests)
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

### Working
- Frontend v2 (all pages rewritten from scratch, Cream Balance design)
- 239 vitest tests passing (all parsers + sections)
- Supabase Auth (sign in, sign up, session validation, sign out)
- Demo mode (cookie-based, static .md files)
- Build compiles clean (Next.js 16)
- Chat components exist (ChatBubble, ChatPanel, ChatMessage)
- API proxy to Orgo.ai Gateway exists (`/api/companion/[...path]`)

### Pending
- Connect chat bubble to Gateway API (family ↔ agent conversation)
- Provider Portal (B2B registration CRUD)
- Document upload integration (Supabase Storage ↔ agent processing)
- Care Team invites (doctors/schools upload + messaging)
- Agent ↔ Supabase loop (agent reads provider DB, processes uploads)
- Real-time notifications (email/SMS via Resend/Twilio)
- Adolescent sections (employment, university)

## Rules

- Never use a database for agent-produced content — workspace `.md` is source of truth
- All parsers must have corresponding test files
- Demo data in `public/demo-data/` must stay in sync with parser expectations
- CSS variables in `globals.css` drive the entire color system
- Run `npm test` before committing parser changes
- The agent is the product, the dashboard is the window
- Claude Code is the primary development tool (not Alfredo/OpenClaw)
