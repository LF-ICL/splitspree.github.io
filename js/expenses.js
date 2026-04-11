/**
 * expenses.js
 * Expense creation, editing, and deletion for SplitSpree.
 * Depends on: storage.js, groups.js (must be loaded first)
 */

/**
 * Adds a new expense to a group and saves it.
 * The expense is split equally among ALL members of the group.
 * @param {string} groupId
 * @param {string} desc - Short description (e.g. "Dinner").
 * @param {number} amount - Total amount paid (must be > 0).
 * @param {string} paidBy - Name of the member who paid (must be in group).
 * @returns {Object} The newly created expense object.
 * @throws {Error} On validation failure.
 */
function addExpense(groupId, desc, amount, paidBy) {
  const group = getGroupById(groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  const trimmedDesc = desc.trim();
  if (!trimmedDesc) throw new Error('Expense description cannot be empty.');

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Amount must be a positive number.');
  }

  if (!group.members.includes(paidBy)) {
    throw new Error(`"${paidBy}" is not a member of this group.`);
  }

  const expense = {
    id: generateId(),
    desc: trimmedDesc,
    amount: parsedAmount,
    paidBy,
  };

  group.expenses.push(expense);
  saveGroup(group);
  return expense;
}

/**
 * Edits an existing expense in a group.
 * Only the fields you pass will be updated (desc, amount, paidBy).
 * @param {string} groupId
 * @param {string} expenseId
 * @param {Object} updates - Object with any of { desc, amount, paidBy }
 * @returns {Object} The updated expense object.
 * @throws {Error} If group or expense not found, or validation fails.
 */
function editExpense(groupId, expenseId, updates) {
  const group = getGroupById(groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  const expense = group.expenses.find(e => e.id === expenseId);
  if (!expense) throw new Error(`Expense not found: ${expenseId}`);

  if (updates.desc !== undefined) {
    const trimmed = updates.desc.trim();
    if (!trimmed) throw new Error('Expense description cannot be empty.');
    expense.desc = trimmed;
  }

  if (updates.amount !== undefined) {
    const parsed = parseFloat(updates.amount);
    if (isNaN(parsed) || parsed <= 0) throw new Error('Amount must be a positive number.');
    expense.amount = parsed;
  }

  if (updates.paidBy !== undefined) {
    if (!group.members.includes(updates.paidBy)) {
      throw new Error(`"${updates.paidBy}" is not a member of this group.`);
    }
    expense.paidBy = updates.paidBy;
  }

  saveGroup(group);
  return expense;
}

/**
 * Deletes an expense from a group.
 * @param {string} groupId
 * @param {string} expenseId
 * @throws {Error} If group or expense not found.
 */
function removeExpense(groupId, expenseId) {
  const group = getGroupById(groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  const before = group.expenses.length;
  group.expenses = group.expenses.filter(e => e.id !== expenseId);

  if (group.expenses.length === before) {
    throw new Error(`Expense not found: ${expenseId}`);
  }

  saveGroup(group);
}

/**
 * Returns all expenses for a group.
 * @param {string} groupId
 * @returns {Array}
 */
function getExpenses(groupId) {
  const group = getGroupById(groupId);
  if (!group) return [];
  return group.expenses;
}
