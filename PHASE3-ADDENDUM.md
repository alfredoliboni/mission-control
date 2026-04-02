# Phase 3 Addendum — Document Visibility Controls

## CRITICAL REQUIREMENT: Per-document, per-stakeholder visibility toggles

The parent (family) must control which stakeholders can see each document.

### UX Flow
1. Parent uploads a document (e.g., "Dr. Silva — Diagnosis Report")
2. A permissions panel shows all linked stakeholders with toggles:
   - OT (Pathways) → ✅ on / ❌ off
   - SLP (Jessica Park) → ✅ on / ❌ off  
   - School (St. Mary's) → ✅ on / ❌ off
3. Parent can change visibility at any time from the Documents page
4. Default: new documents are visible ONLY to parent until they toggle others on

### Schema Addition

```sql
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES auth.users(id),
  can_view BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, stakeholder_id)
);

-- RLS: only parents can manage permissions for their family's documents
-- Stakeholders can only read their own permission rows
```

### UI Components Needed
- DocumentPermissions component: list of stakeholders with toggles for a given document
- Show as expandable panel or modal on each document card
- Documents page: stakeholders only see documents where they have can_view = true
- Badge showing "Shared with 3 of 5" on each document card
