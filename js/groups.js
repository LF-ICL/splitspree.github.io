/**
 * groups.js
 * Group creation and member management for SplitSpree.
 * Depends on: storage.js (must be loaded first)
 */

/**
 * Generates a simple unique ID using the current timestamp + random suffix.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

/**
 * Creates a new group and persists it to storage.
 * @param {string} name - The display name for the group (e.g. "Tokyo trip").
 * @param {string[]} members - Array of member name strings (e.g. ["Alice", "Bob"]).
 * @returns {Object} The newly created group object.
 * @throws {Error} If name is empty or fewer than 2 members are provided.
 */
function createGroup(name, members) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Group name cannot be empty.');

  const cleanMembers = members.map(m => m.trim()).filter(Boolean);
  if (cleanMembers.length < 2) throw new Error('A group needs at least 2 members.');

  const group = {
    id: generateId(),
    name: trimmedName,
    members: cleanMembers,
    expenses: [],
  };

  saveGroup(group);
  return group;
}

/**
 * Renames an existing group.
 * @param {string} groupId
 * @param {string} newName
 * @returns {Object} Updated group object.
 * @throws {Error} If group not found or name is empty.
 */
function renameGroup(groupId, newName) {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('Group name cannot be empty.');

  const group = getGroupById(groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  group.name = trimmed;
  saveGroup(group);
  return group;
}

/**
 * Adds a new member to an existing group.
 * @param {string} groupId
 * @param {string} memberName
 * @returns {Object} Updated group object.
 * @throws {Error} If group not found, name is empty, or member already exists.
 */
function addMember(groupId, memberName) {
  const trimmed = memberName.trim();
  if (!trimmed) throw new Error('Member name cannot be empty.');

  const group = getGroupById(groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  if (group.members.includes(trimmed)) {
    throw new Error(`"${trimmed}" is already in this group.`);
  }

  group.members.push(trimmed);
  saveGroup(group);
  return group;
}

/**
 * Removes a member from a group.
 * Will refuse if the member is referenced by any existing expense.
 * @param {string} groupId
 * @param {string} memberName
 * @returns {Object} Updated group object.
 * @throws {Error} If member has expenses tied to them.
 */
function removeMember(groupId, memberName) {
  const group = getGroupById(groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  const isInExpense = group.expenses.some(e => e.paidBy === memberName);
  if (isInExpense) {
    throw new Error(`Cannot remove "${memberName}" — they have expenses recorded.`);
  }

  group.members = group.members.filter(m => m !== memberName);
  saveGroup(group);
  return group;
}

/**
 * Deletes an entire group and all its expenses.
 * @param {string} groupId
 */
function removeGroup(groupId) {
  deleteGroup(groupId);
}

/**
 * Returns all groups (thin wrapper for UI convenience).
 * @returns {Array}
 */
function listGroups() {
  return getAllGroups();
}
