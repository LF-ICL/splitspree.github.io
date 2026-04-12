/**
 * groups.js
 * Group and group-member management for SplitSpree.
 * All data lives in Supabase — no localStorage.
 *
 * Depends on: supabase.js, auth.js
 *
 * ── Public API ──────────────────────────────────────────────────────────────
 *   listGroups()                          → all groups the current user is in
 *   getGroup(groupId)                     → single group with members
 *   createGroup(name, memberNames)        → creates group + adds current user + dummies
 *   renameGroup(groupId, newName)         → updates group name
 *   removeGroup(groupId)                  → deletes group (owner only)
 *   addDummyMember(groupId, displayName)  → adds an unregistered placeholder member
 *   removeMember(groupId, memberId)       → removes a member (blocks if has expenses)
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Returns all groups the current user is a member of,
 * including the member list for each.
 * @returns {Promise<Array>}
 */
async function listGroups() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: memberships, error: mErr } = await _sb
    .from('group_members')
    .select('group_id')
    .eq('profile_id', user.id);

  if (mErr || !memberships.length) return [];

  const groupIds = memberships.map(m => m.group_id);

  const { data: groups, error: gErr } = await _sb
    .from('groups')
    .select(`
      id, name, created_by, created_at,
      group_members (id, display_name, profile_id, is_dummy)
    `)
    .in('id', groupIds)
    .order('created_at', { ascending: false });

  if (gErr) { console.error('listGroups:', gErr); return []; }
  return groups || [];
}

/**
 * Returns a single group with its full member list.
 * @param {string} groupId
 * @returns {Promise<Object|null>}
 */
async function getGroup(groupId) {
  const { data, error } = await _sb
    .from('groups')
    .select(`
      id, name, created_by, created_at,
      group_members (id, display_name, profile_id, is_dummy)
    `)
    .eq('id', groupId)
    .single();

  if (error) { console.error('getGroup:', error); return null; }
  return data;
}

/**
 * Creates a new group, adds the current user as the first member,
 * then adds any additional names as dummy or real members.
 *
 * @param {string} name - Group name (e.g. "Tokyo trip").
 * @param {string[]} extraMemberNames - Other members by display name.
 *   If a name matches a registered profile's username, they are linked;
 *   otherwise they become dummy members.
 * @returns {Promise<{ok: boolean, group?: Object, message?: string}>}
 */
async function createGroup(name, extraMemberNames = []) {
  const trimName = name.trim();
  if (!trimName) return { ok: false, message: 'Group name cannot be empty.' };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You must be logged in to create a group.' };

  const { data: group, error: gErr } = await _sb
    .from('groups')
    .insert({ name: trimName, created_by: user.id })
    .select()
    .single();

  if (gErr) return { ok: false, message: 'Failed to create group: ' + gErr.message };

  const membersToInsert = [{
    group_id:     group.id,
    profile_id:   user.id,
    display_name: user.username,
    is_dummy:     false,
  }];

  for (const rawName of extraMemberNames) {
    const trimmed = rawName.trim();
    if (!trimmed || trimmed.toLowerCase() === user.username.toLowerCase()) continue;

    const { data: match } = await _sb
      .from('profiles')
      .select('id, username')
      .ilike('username', trimmed)
      .maybeSingle();

    membersToInsert.push({
      group_id:     group.id,
      profile_id:   match ? match.id       : null,
      display_name: match ? match.username : trimmed,
      is_dummy:     !match,
    });
  }

  const { error: mErr } = await _sb.from('group_members').insert(membersToInsert);
  if (mErr) return { ok: false, message: 'Group created but member insert failed: ' + mErr.message };

  return { ok: true, group };
}

/**
 * Renames a group. Only the group creator can rename (enforced by RLS).
 * @param {string} groupId
 * @param {string} newName
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function renameGroup(groupId, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, message: 'Group name cannot be empty.' };

  const { error } = await _sb
    .from('groups')
    .update({ name: trimmed })
    .eq('id', groupId);

  if (error) return { ok: false, message: 'Failed to rename group: ' + error.message };
  return { ok: true, message: 'Group renamed.' };
}

/**
 * Deletes a group and all its members and expenses (via CASCADE).
 * Only the group creator can delete (enforced by RLS).
 * @param {string} groupId
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function removeGroup(groupId) {
  const { error } = await _sb
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) return { ok: false, message: 'Failed to delete group: ' + error.message };
  return { ok: true, message: 'Group deleted.' };
}

/**
 * Adds an unregistered placeholder (dummy) member to a group.
 * Triggers the auto-merge queue check via the DB trigger if the name
 * matches any existing registered profile.
 *
 * @param {string} groupId
 * @param {string} displayName
 * @returns {Promise<{ok: boolean, member?: Object, message?: string}>}
 */
async function addDummyMember(groupId, displayName) {
  const trimmed = displayName.trim();
  if (!trimmed) return { ok: false, message: 'Member name cannot be empty.' };

  const { data, error } = await _sb
    .from('group_members')
    .insert({ group_id: groupId, profile_id: null, display_name: trimmed, is_dummy: true })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, message: `"${trimmed}" is already in this group.` };
    return { ok: false, message: 'Failed to add member: ' + error.message };
  }

  return { ok: true, member: data };
}

/**
 * Removes a member from a group. Blocked if they have expenses.
 * @param {string} groupId
 * @param {string} memberId - group_members.id (UUID)
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function removeMember(groupId, memberId) {
  const { count, error: countErr } = await _sb
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('paid_by_member_id', memberId);

  if (countErr) return { ok: false, message: 'Could not verify expenses.' };
  if (count > 0) return { ok: false, message: 'Cannot remove a member who has expenses recorded.' };

  const { error } = await _sb
    .from('group_members')
    .delete()
    .eq('id', memberId)
    .eq('group_id', groupId);

  if (error) return { ok: false, message: 'Failed to remove member: ' + error.message };
  return { ok: true, message: 'Member removed.' };
}
