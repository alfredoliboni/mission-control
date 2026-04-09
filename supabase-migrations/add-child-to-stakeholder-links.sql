-- Add per-child invite support to stakeholder_links
-- Allows the same stakeholder to be linked to different children in the same family.
-- 2026-04-06

ALTER TABLE stakeholder_links ADD COLUMN IF NOT EXISTS child_name text;
ALTER TABLE stakeholder_links ADD COLUMN IF NOT EXISTS child_agent_id text;
