/**
 * expenses.js
 * Expense creation, editing, and deletion for SplitSpree.
 * All data lives in Supabase.
 *
 * Depends on: supabase.js, auth.js
 *
 * ── Public API ──────────────────────────────────────────────────────────────
 *   getExpenses(groupId)                          → all expenses for a group
 *   addExpense(groupId, desc, amount, memberId)   → creates a validated expense
 *   editExpense(expenseId, updates)               → patches an expense (owner only)
 *   removeExpense(expenseId)                      → deletes an expense (owner only)
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Returns all expenses for a group, including the payer's display name.
 * Ordered by creation time ascending (oldest first).
 *
 * @param {string} groupId
 * @returns {Promise<Array>}
 */
async function getExpenses(groupId) {
  const { data, error } = await _sb
    .from('expenses')
    .select(`
      id, description, amount, created_at, created_by,
      group_members!paid_by_member_id (id, display_name, is_dummy)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) { console.error('getExpenses:', error); return []; }
  return data || [];
}

/**
 * Adds a new expense to a group.
 * The expense is split equally among all current group members.
 *
 * @param {string} groupId
 * @param {string} desc       - Short description (e.g. "Dinner").
 * @param {number|string} amount - Total amount paid (must be > 0).
 * @param {string} memberId   - group_members.id of the member who paid.
 * @returns {Promise<{ok: boolean, expense?: Object, message?: string}>}
 */
async function addExpense(groupId, desc, amount, memberId) {
  const trimDesc = desc.trim();
  if (!trimDesc) return { ok: false, message: 'Description cannot be empty.' };

  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) return { ok: false, message: 'Amount must be a positive number.' };

  if (!memberId) return { ok: false, message: 'Please select who paid.' };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You must be logged in.' };

  const { data, error } = await _sb
    .from('expenses')
    .insert({
      group_id:           groupId,
      description:        trimDesc,
      amount:             parsed,
      paid_by_member_id:  memberId,
      created_by:         user.id,
    })
    .select(`
      id, description, amount, created_at,
      group_members!paid_by_member_id (id, display_name, is_dummy)
    `)
    .single();

  if (error) return { ok: false, message: 'Failed to add expense: ' + error.message };
  return { ok: true, expense: data };
}

/**
 * Edits an existing expense. Only the original creator can edit (RLS enforced).
 * Pass only the fields you want to change: desc, amount, memberId.
 *
 * @param {string} expenseId
 * @param {Object} updates
 * @param {string}  [updates.desc]
 * @param {number}  [updates.amount]
 * @param {string}  [updates.memberId] - new paid_by_member_id
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function editExpense(expenseId, updates) {
  const patch = {};

  if (updates.desc !== undefined) {
    const trimmed = updates.desc.trim();
    if (!trimmed) return { ok: false, message: 'Description cannot be empty.' };
    patch.description = trimmed;
  }

  if (updates.amount !== undefined) {
    const parsed = parseFloat(updates.amount);
    if (isNaN(parsed) || parsed <= 0) return { ok: false, message: 'Amount must be a positive number.' };
    patch.amount = parsed;
  }

  if (updates.memberId !== undefined) {
    patch.paid_by_member_id = updates.memberId;
  }

  if (Object.keys(patch).length === 0) return { ok: false, message: 'No changes provided.' };

  const { error } = await _sb
    .from('expenses')
    .update(patch)
    .eq('id', expenseId);

  if (error) return { ok: false, message: 'Failed to update expense: ' + error.message };
  return { ok: true, message: 'Expense updated.' };
}

/**
 * Deletes an expense. Only the original creator can delete (RLS enforced).
 * @param {string} expenseId
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function removeExpense(expenseId) {
  const { error } = await _sb
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) return { ok: false, message: 'Failed to delete expense: ' + error.message };
  return { ok: true, message: 'Expense deleted.' };
}
