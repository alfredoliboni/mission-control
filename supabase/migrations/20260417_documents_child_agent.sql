-- Add per-child scoping to documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS child_agent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_family_child_agent
  ON documents (family_id, child_agent_id);

-- Update RLS: document DELETE — uploader only
DROP POLICY IF EXISTS "documents_delete_uploader" ON documents;
CREATE POLICY "documents_delete_uploader" ON documents
  FOR DELETE USING (uploaded_by = auth.uid());
