-- ============================================================
-- SplitSpree — FULL RESET + RECREATE
-- Drops all tables, triggers, and functions, then rebuilds.
-- ============================================================

-- ── Drop triggers first ──────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created         ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_check_dummies ON profiles;

-- ── Drop functions ───────────────────────────────────────────
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS queue_dummy_merges();

-- ── Drop tables (order matters due to foreign keys) ──────────
DROP TABLE IF EXISTS dummy_merge_queue CASCADE;
DROP TABLE IF EXISTS expenses           CASCADE;
DROP TABLE IF EXISTS group_members      CASCADE;
DROP TABLE IF EXISTS groups             CASCADE;
DROP TABLE IF EXISTS profiles           CASCADE;

-- ── 1. Profiles ──────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

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

-- ── 2. Groups ─────────────────────────────────────────────────
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Group members ──────────────────────────────────────────
CREATE TABLE group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  display_name  TEXT NOT NULL,
  is_dummy      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, display_name)
);

-- ── 4. Expenses ───────────────────────────────────────────────
CREATE TABLE expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid_by_member_id   UUID NOT NULL REFERENCES group_members(id) ON DELETE RESTRICT,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Dummy merge queue ──────────────────────────────────────
CREATE TABLE dummy_merge_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  new_profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Row-Level Security ─────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dummy_merge_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_all"   ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "groups_member_access" ON groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
      AND group_members.profile_id = auth.uid()
  ));
CREATE POLICY "groups_insert_auth" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_delete_own"  ON groups FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "groups_update_own"  ON groups FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "group_members_access" ON group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.profile_id = auth.uid()
  ));
CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM groups WHERE groups.id = group_id AND groups.created_by = auth.uid())
    OR auth.uid() IS NOT NULL
  );
CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM groups WHERE groups.id = group_id AND groups.created_by = auth.uid()
  ));

CREATE POLICY "expenses_member_read" ON expenses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = expenses.group_id
      AND group_members.profile_id = auth.uid()
  ));
CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_id
      AND group_members.profile_id = auth.uid()
  ));
CREATE POLICY "expenses_delete_own" ON expenses FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "expenses_update_own" ON expenses FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "merge_queue_access" ON dummy_merge_queue FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM groups WHERE groups.id = group_id AND groups.created_by = auth.uid())
    OR new_profile_id = auth.uid()
  );
CREATE POLICY "merge_queue_insert" ON dummy_merge_queue FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "merge_queue_update" ON dummy_merge_queue FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM groups WHERE groups.id = group_id AND groups.created_by = auth.uid()
  ));

-- ── 7. Auto-queue dummy merges on registration ────────────────
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
