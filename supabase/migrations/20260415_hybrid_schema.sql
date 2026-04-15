-- ============================================================================
-- Migration: Hybrid Architecture — 5 New Tables
-- Date: 2026-04-15
-- Adds family_alerts, family_team_members, family_benefits,
--      family_programs, family_providers
-- All tables use RLS; family_id = auth.uid() for full access.
-- service_role bypass policy added to each table.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--   DROP POLICY IF EXISTS before each CREATE POLICY.
-- ============================================================================

-- ── Trigger function (reuse if already exists) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. family_alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_alerts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id            TEXT        NOT NULL,
  child_name          TEXT,
  date                DATE        NOT NULL,
  severity            TEXT        NOT NULL DEFAULT 'INFO'
                                  CHECK (severity IN ('HIGH', 'MEDIUM', 'INFO')),
  title               TEXT        NOT NULL,
  description         TEXT        DEFAULT '',
  action              TEXT        DEFAULT '',
  status              TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'dismissed', 'completed')),
  completed_at        TIMESTAMPTZ,
  notes               TEXT[]      DEFAULT '{}',
  source              TEXT        DEFAULT 'agent',
  related_entity_type TEXT,       -- 'benefit', 'provider', 'program'
  related_entity_id   UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_alerts_family_id  ON public.family_alerts (family_id);
CREATE INDEX IF NOT EXISTS idx_family_alerts_status     ON public.family_alerts (status);
CREATE INDEX IF NOT EXISTS idx_family_alerts_date       ON public.family_alerts (date);
CREATE INDEX IF NOT EXISTS idx_family_alerts_severity   ON public.family_alerts (severity);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_family_alerts_updated_at ON public.family_alerts;
CREATE TRIGGER trg_family_alerts_updated_at
  BEFORE UPDATE ON public.family_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.family_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_alerts_family_all"    ON public.family_alerts;
DROP POLICY IF EXISTS "family_alerts_service_role"  ON public.family_alerts;

CREATE POLICY "family_alerts_family_all" ON public.family_alerts
  FOR ALL USING (family_id = auth.uid())
  WITH CHECK (family_id = auth.uid());

CREATE POLICY "family_alerts_service_role" ON public.family_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. family_team_members  (replaces journey-partners.md + stakeholder_links)
-- NOTE: stakeholder_links is NOT dropped — kept for backward compatibility.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_team_members (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id            TEXT        NOT NULL,
  child_name          TEXT,
  name                TEXT        NOT NULL,
  role                TEXT        DEFAULT '',
  organization        TEXT        DEFAULT '',
  services            TEXT        DEFAULT '',
  phone               TEXT        DEFAULT '',
  email               TEXT        DEFAULT '',
  website             TEXT        DEFAULT '',
  status              TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'former', 'pending', 'declined')),
  stakeholder_user_id UUID        REFERENCES auth.users(id),  -- nullable; set if stakeholder has account
  permissions         JSONB       DEFAULT '{}',
  invite_token        TEXT,
  started_at          DATE,
  removed_at          DATE,
  removed_reason      TEXT,
  source              TEXT        DEFAULT 'agent',
  agent_note          TEXT        DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_team_members_family_id  ON public.family_team_members (family_id);
CREATE INDEX IF NOT EXISTS idx_family_team_members_status     ON public.family_team_members (status);
CREATE INDEX IF NOT EXISTS idx_family_team_members_stake_uid  ON public.family_team_members (stakeholder_user_id)
  WHERE stakeholder_user_id IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_family_team_members_updated_at ON public.family_team_members;
CREATE TRIGGER trg_family_team_members_updated_at
  BEFORE UPDATE ON public.family_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.family_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_team_members_family_all"   ON public.family_team_members;
DROP POLICY IF EXISTS "family_team_members_service_role" ON public.family_team_members;

CREATE POLICY "family_team_members_family_all" ON public.family_team_members
  FOR ALL USING (family_id = auth.uid())
  WITH CHECK (family_id = auth.uid());

CREATE POLICY "family_team_members_service_role" ON public.family_team_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. family_benefits
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_benefits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id            TEXT        NOT NULL,
  benefit_name        TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'not_started'
                                  CHECK (status IN (
                                    'not_started', 'pending', 'approved',
                                    'denied', 'active', 'renewed', 'unknown'
                                  )),
  applied_date        DATE,
  approved_date       DATE,
  renewal_date        DATE,
  amount              TEXT        DEFAULT '',
  eligibility_detail  TEXT        DEFAULT '',
  action              TEXT        DEFAULT '',
  documents_needed    TEXT        DEFAULT '',
  agent_note          TEXT        DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_benefits_family_id    ON public.family_benefits (family_id);
CREATE INDEX IF NOT EXISTS idx_family_benefits_status       ON public.family_benefits (status);
CREATE INDEX IF NOT EXISTS idx_family_benefits_renewal_date ON public.family_benefits (renewal_date)
  WHERE renewal_date IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_family_benefits_updated_at ON public.family_benefits;
CREATE TRIGGER trg_family_benefits_updated_at
  BEFORE UPDATE ON public.family_benefits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.family_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_benefits_family_all"   ON public.family_benefits;
DROP POLICY IF EXISTS "family_benefits_service_role" ON public.family_benefits;

CREATE POLICY "family_benefits_family_all" ON public.family_benefits
  FOR ALL USING (family_id = auth.uid())
  WITH CHECK (family_id = auth.uid());

CREATE POLICY "family_benefits_service_role" ON public.family_benefits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. family_programs  (junction: family ↔ programs catalog)
-- program_id is nullable to support agent-discovered programs not yet
-- in the catalog; program_name is denormalized for that case.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_programs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id   UUID        REFERENCES public.programs(id),  -- nullable; FK to existing programs table
  agent_id     TEXT        NOT NULL,
  program_name TEXT        NOT NULL,  -- denormalized for when program_id is null
  status       TEXT        NOT NULL DEFAULT 'recommended'
               CHECK (status IN ('recommended', 'applied', 'enrolled', 'completed', 'dropped')),
  agent_note   TEXT        DEFAULT '',
  is_gap_filler BOOLEAN    DEFAULT false,
  enrolled_at  DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_programs_family_id   ON public.family_programs (family_id);
CREATE INDEX IF NOT EXISTS idx_family_programs_program_id  ON public.family_programs (program_id)
  WHERE program_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_programs_status      ON public.family_programs (status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_family_programs_updated_at ON public.family_programs;
CREATE TRIGGER trg_family_programs_updated_at
  BEFORE UPDATE ON public.family_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.family_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_programs_family_all"   ON public.family_programs;
DROP POLICY IF EXISTS "family_programs_service_role" ON public.family_programs;

CREATE POLICY "family_programs_family_all" ON public.family_programs
  FOR ALL USING (family_id = auth.uid())
  WITH CHECK (family_id = auth.uid());

CREATE POLICY "family_programs_service_role" ON public.family_programs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. family_providers  (junction: family ↔ providers catalog)
-- provider_id is nullable to support agent-discovered providers not yet
-- in the catalog; provider_name is denormalized for that case.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_providers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id   UUID        REFERENCES public.providers(id),  -- nullable; FK to existing providers table
  agent_id      TEXT        NOT NULL,
  provider_name TEXT        NOT NULL,  -- denormalized for when provider_id is null
  priority      TEXT        DEFAULT 'relevant'
                CHECK (priority IN ('highest', 'relevant', 'other')),
  status        TEXT        NOT NULL DEFAULT 'recommended'
                CHECK (status IN ('recommended', 'contacted', 'waitlisted', 'active', 'declined')),
  agent_note    TEXT        DEFAULT '',
  is_gap_filler BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_providers_family_id   ON public.family_providers (family_id);
CREATE INDEX IF NOT EXISTS idx_family_providers_provider_id ON public.family_providers (provider_id)
  WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_providers_status      ON public.family_providers (status);
CREATE INDEX IF NOT EXISTS idx_family_providers_priority    ON public.family_providers (priority);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_family_providers_updated_at ON public.family_providers;
CREATE TRIGGER trg_family_providers_updated_at
  BEFORE UPDATE ON public.family_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.family_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_providers_family_all"   ON public.family_providers;
DROP POLICY IF EXISTS "family_providers_service_role" ON public.family_providers;

CREATE POLICY "family_providers_family_all" ON public.family_providers
  FOR ALL USING (family_id = auth.uid())
  WITH CHECK (family_id = auth.uid());

CREATE POLICY "family_providers_service_role" ON public.family_providers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'family_alerts','family_team_members','family_benefits',
--     'family_programs','family_providers'
--   )
-- ORDER BY tablename, policyname;
