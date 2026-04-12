-- ============================================================
-- SplitSpree — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Profiles ─────────────────────────────────────────────
-- One row per registered user. Linked to Supabase's built-in auth.users.
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically create a profile row when a user confirms their email.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. Groups ────────────────────────────────────────────────
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Group members ─────────────────────────────────────────
-- profile_id is NULL for dummy (unregistered) members.
CREATE TABLE group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL = dummy
  display_name  TEXT NOT NULL,
  is_dummy      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, display_name)  -- no duplicate names within a group
);

-- ── 4. Expenses ──────────────────────────────────────────────
CREATE TABLE expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid_by_member_id   UUID NOT NULL REFERENCES group_members(id) ON DELETE RESTRICT,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Dummy merge queue ─────────────────────────────────────
-- When a new user registers and their username matches a dummy in a group,
-- a row is inserted here so the group creator can confirm or dismiss the merge.
CREATE TABLE dummy_merge_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  new_profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted' | 'dismissed'
                    CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Row-Level Security (RLS) ──────────────────────────────
-- Users can only read/write data for groups they belong to.

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dummy_merge_queue ENABLE ROW LEVEL SECURITY;

-- profiles: users can read any profile (needed to show member names),
--           but only update their own.
CREATE POLICY "profiles_read_all"   ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- groups: a user can see a group if they are a member of it.
CREATE POLICY "groups_member_access" ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "groups_insert_auth" ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_delete_own" ON groups FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "groups_update_own" ON groups FOR UPDATE
  USING (auth.uid() = created_by);

-- group_members: visible to any member of that group.
CREATE POLICY "group_members_access" ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.profile_id = auth.uid()
    )
  );

CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
        AND groups.created_by = auth.uid()
    )
    OR auth.uid() IS NOT NULL  -- any auth user can add themselves
  );

CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
        AND groups.created_by = auth.uid()
    )
  );

-- expenses: visible to group members, editable by creator.
CREATE POLICY "expenses_member_read" ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = expenses.group_id
        AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_id
        AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "expenses_delete_own" ON expenses FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "expenses_update_own" ON expenses FOR UPDATE
  USING (auth.uid() = created_by);

-- dummy_merge_queue: only the group creator sees pending merges.
CREATE POLICY "merge_queue_access" ON dummy_merge_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
        AND groups.created_by = auth.uid()
    )
    OR new_profile_id = auth.uid()
  );

CREATE POLICY "merge_queue_insert" ON dummy_merge_queue FOR INSERT
  WITH CHECK (TRUE);  -- inserted by the trigger function (SECURITY DEFINER)

CREATE POLICY "merge_queue_update" ON dummy_merge_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
        AND groups.created_by = auth.uid()
    )
  );

-- ── 7. Auto-queue dummy merge on new registration ────────────
-- When a new profile is created, look for dummy members with the same
-- display_name in any group, and insert a merge proposal for each.
CREATE OR REPLACE FUNCTION queue_dummy_merges()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.dummy_merge_queue (dummy_member_id, new_profile_id, group_id)
  SELECT gm.id, NEW.id, gm.group_id
  FROM public.group_members gm
  WHERE gm.is_dummy = TRUE
    AND LOWER(gm.display_name) = LOWER(NEW.username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_check_dummies
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION queue_dummy_merges();
