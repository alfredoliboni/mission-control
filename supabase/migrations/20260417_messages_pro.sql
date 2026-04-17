-- ============================================================================
-- Migration: Professional Messaging Features
-- Date: 2026-04-17
-- Adds: child_agent_id (per-child filtering), deleted_at (soft delete),
--        read_at (read/unread tracking)
-- ============================================================================

-- Per-child message filtering
ALTER TABLE messages ADD COLUMN IF NOT EXISTS child_agent_id TEXT;

-- Soft delete support (trash)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Read/unread tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_child_agent ON messages(child_agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(read_at) WHERE read_at IS NULL;
