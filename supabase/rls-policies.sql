-- ============================================================================
-- RLS Policies for The Companion
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- ── Documents ───────────────────────────────────────────────────────────────
-- Families can CRUD their own documents
-- Stakeholders can view documents they uploaded or have permission for

-- Fix infinite recursion: use SECURITY DEFINER function to check permissions
-- without triggering RLS on document_permissions from within documents policy
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
DROP POLICY IF EXISTS "documents_family_all" ON documents;
DROP POLICY IF EXISTS "documents_stakeholder_view" ON documents;
DROP POLICY IF EXISTS "documents_stakeholder_insert" ON documents;

-- Helper function that bypasses RLS on document_permissions
CREATE OR REPLACE FUNCTION public.can_view_document(doc_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id = doc_id
      AND stakeholder_id = user_id
      AND can_view = true
  );
$$;

-- Helper function that checks stakeholder link status
CREATE OR REPLACE FUNCTION public.is_accepted_stakeholder(stakeholder uuid, family uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stakeholder_links
    WHERE stakeholder_id = stakeholder
      AND family_id = family
      AND (status = 'accepted' OR status IS NULL)
  );
$$;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_family_all" ON documents
  FOR ALL USING (family_id = auth.uid());

CREATE POLICY "documents_stakeholder_view" ON documents
  FOR SELECT USING (
    uploaded_by = auth.uid()
    OR public.can_view_document(id, auth.uid())
  );

CREATE POLICY "documents_stakeholder_insert" ON documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_accepted_stakeholder(auth.uid(), family_id)
  );

-- ── Document Permissions ────────────────────────────────────────────────────
-- Only the family (granter) can manage permissions

DROP POLICY IF EXISTS "doc_perms_family" ON document_permissions;
DROP POLICY IF EXISTS "doc_perms_stakeholder_view" ON document_permissions;

ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_perms_family" ON document_permissions
  FOR ALL USING (granted_by = auth.uid());

CREATE POLICY "doc_perms_stakeholder_view" ON document_permissions
  FOR SELECT USING (stakeholder_id = auth.uid());

-- ── Messages ────────────────────────────────────────────────────────────────
-- Families see their own messages
-- Stakeholders see messages in families they're linked to

DROP POLICY IF EXISTS "messages_family" ON messages;
DROP POLICY IF EXISTS "messages_stakeholder" ON messages;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_family" ON messages
  FOR ALL USING (family_id = auth.uid());

CREATE POLICY "messages_stakeholder_view" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM stakeholder_links sl
      WHERE sl.stakeholder_id = auth.uid()
        AND sl.family_id = messages.family_id
        AND (sl.status = 'accepted' OR sl.status IS NULL)
    )
  );

CREATE POLICY "messages_stakeholder_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM stakeholder_links sl
      WHERE sl.stakeholder_id = auth.uid()
        AND sl.family_id = messages.family_id
        AND (sl.status = 'accepted' OR sl.status IS NULL)
    )
  );

-- ── Stakeholder Links ───────────────────────────────────────────────────────
-- Families see and manage their own links
-- Stakeholders see links where they are the stakeholder

DROP POLICY IF EXISTS "stakeholder_links_family" ON stakeholder_links;
DROP POLICY IF EXISTS "stakeholder_links_stakeholder" ON stakeholder_links;

ALTER TABLE stakeholder_links ENABLE ROW LEVEL SECURITY;

-- Add status constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_status'
  ) THEN
    ALTER TABLE stakeholder_links ADD CONSTRAINT valid_status
      CHECK (status IN ('pending', 'accepted', 'declined'));
  END IF;
END $$;

CREATE POLICY "stakeholder_links_family" ON stakeholder_links
  FOR ALL USING (family_id = auth.uid());

CREATE POLICY "stakeholder_links_stakeholder" ON stakeholder_links
  FOR SELECT USING (stakeholder_id = auth.uid());

-- ── Community Posts ─────────────────────────────────────────────────────────
-- Anyone authenticated can read, only author can update/delete

DROP POLICY IF EXISTS "community_posts_read" ON community_posts;
DROP POLICY IF EXISTS "community_posts_insert" ON community_posts;
DROP POLICY IF EXISTS "community_posts_modify" ON community_posts;

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_posts_read" ON community_posts
  FOR SELECT USING (true); -- Public read (community forum)

CREATE POLICY "community_posts_insert" ON community_posts
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "community_posts_modify" ON community_posts
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "community_posts_delete" ON community_posts
  FOR DELETE USING (author_id = auth.uid());

-- ── Community Comments ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "community_comments_read" ON community_comments;
DROP POLICY IF EXISTS "community_comments_insert" ON community_comments;
DROP POLICY IF EXISTS "community_comments_modify" ON community_comments;

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_comments_read" ON community_comments
  FOR SELECT USING (true);

CREATE POLICY "community_comments_insert" ON community_comments
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "community_comments_modify" ON community_comments
  FOR UPDATE USING (author_id = auth.uid());

-- ── Community Upvotes ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "community_upvotes_read" ON community_upvotes;
DROP POLICY IF EXISTS "community_upvotes_manage" ON community_upvotes;

ALTER TABLE community_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_upvotes_read" ON community_upvotes
  FOR SELECT USING (true);

CREATE POLICY "community_upvotes_manage" ON community_upvotes
  FOR ALL USING (user_id = auth.uid());

-- ── Providers ───────────────────────────────────────────────────────────────
-- Public read (search directory), only service role can insert/update

DROP POLICY IF EXISTS "providers_read" ON providers;

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_read" ON providers
  FOR SELECT USING (true); -- Public directory

-- ── Children ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "children_family" ON children;

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "children_family" ON children
  FOR ALL USING (family_id = auth.uid());

-- ── Profiles ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_own" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid());

-- ============================================================================
-- VERIFICATION: Run after applying
-- ============================================================================
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
