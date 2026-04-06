# The Companion — Mission Control

Family-facing dashboard for navigating Ontario's autism services. Each family gets a personal AI agent (OpenClaw Navigator) that researches services, monitors deadlines, and prepares recommendations. This dashboard is the family's window into everything the agent has found.

## Quick Start

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 239 tests
npm run build    # production build
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Full architecture, stakeholders, data flow, current state
- **[PRD.md](../PRD.md)** — Product requirements v4.0 (1296 lines, comprehensive spec)
- **[AGENTS.md](./AGENTS.md)** — Next.js 16 breaking changes reference

## Architecture

```
Family → Mission Control (Next.js) → OpenClaw Agent (Orgo.ai VM)
                                   → Supabase (auth, uploads, messages)
```

The agent writes structured markdown files. The dashboard reads and renders them. See CLAUDE.md for details.
