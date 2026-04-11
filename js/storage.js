/**
 * storage.js
 * All localStorage read/write operations for SplitSpree.
 * No other file should touch localStorage directly — go through these functions.
 */

const STORAGE_KEY = 'splitspree_groups';

/**
 * Reads all groups from localStorage.
 * @returns {Array} Array of group objects, or empty array if none saved.
 */
function getAllGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('storage: failed to read groups', e);
    return [];
  }
}

/**
 * Writes the full groups array to localStorage, replacing whatever was there.
 * @param {Array} groups - Array of group objects to persist.
 */
function saveAllGroups(groups) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {
    console.error('storage: failed to save groups', e);
  }
}

/**
 * Finds and returns a single group by its id.
 * @param {string} groupId
 * @returns {Object|null} The group object, or null if not found.
 */
function getGroupById(groupId) {
  const groups = getAllGroups();
  return groups.find(g => g.id === groupId) || null;
}

/**
 * Persists a single group, inserting it if new or replacing it if existing.
 * @param {Object} group - Group object with at least an `id` field.
 */
function saveGroup(group) {
  const groups = getAllGroups();
  const index = groups.findIndex(g => g.id === group.id);
  if (index === -1) {
    groups.push(group);
  } else {
    groups[index] = group;
  }
  saveAllGroups(groups);
}

/**
 * Removes a group from storage by id.
 * @param {string} groupId
 */
function deleteGroup(groupId) {
  const groups = getAllGroups().filter(g => g.id !== groupId);
  saveAllGroups(groups);
}

/**
 * Wipes all SplitSpree data from localStorage.
 * Use with caution — mainly for dev/testing.
 */
function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
}
