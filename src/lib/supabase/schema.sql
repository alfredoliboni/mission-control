-- Mission Control: Supabase Schema
-- Run this in the Supabase SQL editor. Do NOT run from the app.

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  child_nickname TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploader_role TEXT NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  thread_id UUID NOT NULL,
  thread_subject TEXT,
  sender_id UUID REFERENCES auth.users(id),
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stakeholder_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  stakeholder_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL,
  name TEXT,
  organization TEXT,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_links ENABLE ROW LEVEL SECURITY;

-- Helper: check if a user is linked to a given family
CREATE OR REPLACE FUNCTION is_family_member(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM stakeholder_links
    WHERE family_id = fid
      AND stakeholder_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user is a parent for a given family
CREATE OR REPLACE FUNCTION is_parent(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM stakeholder_links
    WHERE family_id = fid
      AND stakeholder_id = auth.uid()
      AND role = 'parent'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----- Documents -----

-- Parents see all documents for their family
CREATE POLICY "Parents can view family documents"
  ON documents FOR SELECT
  USING (is_parent(family_id));

-- Linked stakeholders can view documents for families they are linked to
CREATE POLICY "Stakeholders can view linked family documents"
  ON documents FOR SELECT
  USING (is_family_member(family_id));

-- Authenticated users can upload documents
CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

-- ----- Messages -----

-- Parents see all messages for their family
CREATE POLICY "Parents can view family messages"
  ON messages FOR SELECT
  USING (is_parent(family_id));

-- Linked stakeholders can view messages for families they are linked to
CREATE POLICY "Stakeholders can view linked family messages"
  ON messages FOR SELECT
  USING (is_family_member(family_id));

-- Authenticated users can send messages to families they are linked to
CREATE POLICY "Members can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
    AND is_family_member(family_id)
  );

-- ----- Stakeholder Links -----

-- Parents can see all links for their family
CREATE POLICY "Parents can view family links"
  ON stakeholder_links FOR SELECT
  USING (is_parent(family_id));

-- Stakeholders can see their own links
CREATE POLICY "Stakeholders can view own links"
  ON stakeholder_links FOR SELECT
  USING (stakeholder_id = auth.uid());

-- Parents can create links for their family
CREATE POLICY "Parents can create family links"
  ON stakeholder_links FOR INSERT
  WITH CHECK (is_parent(family_id) AND linked_by = auth.uid());

-- ============================================================
-- Storage: documents bucket
-- ============================================================

-- Create the storage bucket (run once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their family folder
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
  );

-- Family members can view documents in their family folder
-- Path pattern: documents/{family_id}/...
CREATE POLICY "Family members can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND is_family_member((storage.foldername(name))[1]::UUID)
  );
