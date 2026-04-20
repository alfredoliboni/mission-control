-- ============================================================================
-- Migration: family_priorities
-- Date: 2026-04-20
-- Per-child priorities curated by the Navigator agent from onboarding,
-- conversations, uploads, and ongoing observations. Replaces the hardcoded
-- keyword extractor in src/lib/needs.ts as the source for the PriorityBanner.
-- Idempotent: safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_priorities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id    TEXT        NOT NULL,
  child_name  TEXT,
  label       TEXT        NOT NULL,         -- "SLP", "OT", "Social Skills"
  detail      TEXT        DEFAULT '',       -- "speech-language support"
  why         TEXT        DEFAULT '',       -- "Dr. Silva assessment 2026-03-15"
  severity    TEXT        NOT NULL DEFAULT 'medium'
              CHECK (severity IN ('high', 'medium', 'low')),
  status      TEXT        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'addressed', 'archived')),
  sort_order  INTEGER     DEFAULT 0,
  source      TEXT        DEFAULT 'agent',  -- 'onboarding', 'conversation', 'upload', 'agent'
  agent_note  TEXT        DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_priorities_family_id ON public.family_priorities (family_id);
CREATE INDEX IF NOT EXISTS idx_family_priorities_agent_id  ON public.family_priorities (agent_id);
CREATE INDEX IF NOT EXISTS idx_family_priorities_status    ON public.family_priorities (status);

DROP TRIGGER IF EXISTS trg_family_priorities_updated_at ON public.family_priorities;
CREATE TRIGGER trg_family_priorities_updated_at
  BEFORE UPDATE ON public.family_priorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.family_priorities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_priorities_family_all"   ON public.family_priorities;
DROP POLICY IF EXISTS "family_priorities_service_role" ON public.family_priorities;

CREATE POLICY "family_priorities_family_all" ON public.family_priorities
  FOR ALL USING (family_id = auth.uid())
  WITH CHECK (family_id = auth.uid());

CREATE POLICY "family_priorities_service_role" ON public.family_priorities
  FOR ALL TO service_role USING (true) WITH CHECK (true);
