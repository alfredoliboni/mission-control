-- Per-user "Delete for me" model for messages.
-- Family side uses a single boolean; stakeholder side stores hidden auth.user_ids
-- in a JSONB array so multiple stakeholders on one thread can each hide it for
-- themselves without affecting the others.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS hidden_for_family BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_for_stakeholders JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS messages_family_hidden_idx
  ON messages (family_id, hidden_for_family);

CREATE INDEX IF NOT EXISTS messages_stakeholders_hidden_idx
  ON messages USING GIN (hidden_for_stakeholders);

-- Backfill: any message already soft-deleted by the family via deleted_at
-- stays hidden on their side but should now be visible to the stakeholder
-- under the new per-user model.
UPDATE messages
   SET hidden_for_family = true
 WHERE deleted_at IS NOT NULL
   AND hidden_for_family = false;
