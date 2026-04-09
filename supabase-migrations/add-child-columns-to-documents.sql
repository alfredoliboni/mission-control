-- Migration: Add child_id and child_name to documents table
-- Run this manually in Supabase SQL Editor or via supabase migration.
--
-- These columns allow filtering documents per child in multi-child families.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS child_id text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS child_name text;

-- Optional: Create an index for faster filtering by child_name
CREATE INDEX IF NOT EXISTS idx_documents_child_name ON documents (child_name);

-- Optional: Backfill child_name from child_nickname for existing documents
UPDATE documents
SET child_name = child_nickname
WHERE child_name IS NULL AND child_nickname IS NOT NULL;
