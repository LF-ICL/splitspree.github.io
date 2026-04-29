-- ============================================================
-- SplitSpree — RLS Policy Fix
-- Fixes "infinite recursion detected in policy" on group_members.
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Step 1: Drop the offending policies ─────────────────────

DROP POLICY IF EXISTS "group_members_access" ON group_members;
DROP POLICY IF EXISTS "group_members_insert" ON group_members;
DROP POLICY IF EXISTS "group_members_delete" ON group_members;
DROP POLICY IF EXISTS "groups_member_access" ON groups;
DROP POLICY IF EXISTS "expenses_member_read" ON expenses;
DROP POLICY IF EXISTS "expenses_insert"      ON expenses;

-- ── Step 2: Helper function (SECURITY DEFINER bypasses RLS) ─
-- This function checks membership without triggering the policy
-- that would call itself, breaking the recursion.

CREATE OR REPLACE FUNCTION is_group_member(gid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id  = gid
      AND profile_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_group_owner(gid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups
    WHERE id         = gid
      AND created_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Step 3: Recreate policies using the helper functions ─────

-- groups: visible to members, using the helper instead of a subquery on group_members
CREATE POLICY "groups_member_access" ON groups FOR SELECT
  USING (is_group_member(id));

-- group_members: visible if you're a member of that group
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  USING (is_group_member(group_id));

-- group_members: insert allowed if you're the group owner OR inserting yourself
CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (
    is_group_owner(group_id)
    OR profile_id = auth.uid()
  );

-- group_members: only group owner can delete members
CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  USING (is_group_owner(group_id));

-- group_members: owner can update (e.g. dummy merge)
CREATE POLICY "group_members_update" ON group_members FOR UPDATE
  USING (is_group_owner(group_id));

-- expenses: readable by group members
CREATE POLICY "expenses_member_read" ON expenses FOR SELECT
  USING (is_group_member(group_id));

-- expenses: insertable by group members
CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  WITH CHECK (is_group_member(group_id));
