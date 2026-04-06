# Mission Control — The Companion

@AGENTS.md

## What This Is

Family-facing dashboard for navigating Ontario's autism services.
An AI agent (OpenClaw) writes structured markdown files; this dashboard
reads them via a thin API and renders rich UI.

## Architecture: Workspace-First

- Agent writes `memory/*.md` files (child-profile, pathway, alerts, providers, programs, benefits, ontario-system, documents)
- TypeScript parsers in `src/lib/workspace/parsers/` convert markdown to typed JSON
- React Query hooks fetch and cache parsed data (30s refresh in live mode)
- Supabase is minimal: auth + document storage + messages only
- Three data modes: Demo (static .md in `public/demo-data/`), Dev (local filesystem via `WORKSPACE_MEMORY_PATH`), Production (OpenClaw Gateway API via Orgo.ai)

## Key Directories

- `src/lib/workspace/parsers/` — Markdown parsers (the heart of the app)
- `src/hooks/useWorkspace.ts` — Data fetching hooks (dual-mode demo/live)
- `src/components/sections/` — Feature-specific UI components
- `src/components/layout/` — AppShell, Sidebar, TopBar
- `src/app/(authenticated)/` — Protected route pages
- `src/app/api/` — API routes (workspace, chat, companion proxy)
- `public/demo-data/` — Demo markdown files (also used as test fixtures)

## Commands

- `npm run dev` — Start dev server
- `npm test` — Run all tests (vitest)
- `npm run test:watch` — Tests in watch mode
- `npm run build` — Production build
- `npm run lint` — ESLint

## Stack

- Next.js 16 + React 19 (BREAKING CHANGES — read `node_modules/next/dist/docs/`)
- @base-ui/react (headless components, NOT classic shadcn)
- Tailwind CSS v4 (`@theme inline` syntax)
- React Query + Zustand + Supabase
- Vitest for testing

## Design System

- Warm parchment aesthetic (Claude DESIGN.md inspired)
- Instrument Serif for headings, DM Sans for body
- Terracotta primary (`#c96442`), parchment background (`#f5f4ed`)
- Status colors: sage green (success), blue (current), warm red (blocked), gold (caution), dusty purple (gap filler)
- CSS variables in `src/app/globals.css` drive the entire color system

## Format Contract

The agent's markdown format is a machine-readable contract.
Each parser expects specific heading names, table columns, and KV formats.
See `PRD.md` section 3 for the full specification.
Format drift breaks parsers — always test after changing parser logic.

## Rules

- Never use a database for agent-produced content — workspace `.md` is source of truth
- All parsers must have corresponding test files
- Demo data in `public/demo-data/` must stay in sync with parser expectations
- CSS variables in `globals.css` drive the entire color system — modify there, not in individual components
- Run `npm test` before committing parser changes
