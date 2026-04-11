/**
 * balances.js
 * Pure balance calculation logic for SplitSpree.
 * No DOM access — these are all plain data-in, data-out functions.
 * Depends on: storage.js, groups.js (must be loaded first)
 */

/**
 * Calculates the net balance for each member in a group.
 * Positive balance = you are owed money.
 * Negative balance = you owe money.
 * Expenses are split equally among all members.
 *
 * @param {string} groupId
 * @returns {Object} Map of { memberName: netBalance (number) }
 * @example
 *   // Alice paid 3000, Bob paid 0, 3 members split equally (1000 each)
 *   // → { Alice: 2000, Bob: -1000, Charlie: -1000 }
 */
function calculateBalances(groupId) {
  const group = getGroupById(groupId);
  if (!group) return {};

  const memberCount = group.members.length;
  if (memberCount === 0) return {};

  // Initialise every member at zero
  const balances = {};
  group.members.forEach(m => { balances[m] = 0; });

  group.expenses.forEach(expense => {
    const share = expense.amount / memberCount;

    // Payer gets credit for the full amount
    balances[expense.paidBy] += expense.amount;

    // Everyone (including the payer) owes their equal share
    group.members.forEach(member => {
      balances[member] -= share;
    });
  });

  // Round to 2 decimal places to avoid floating point drift
  group.members.forEach(m => {
    balances[m] = Math.round(balances[m] * 100) / 100;
  });

  return balances;
}

/**
 * Calculates the minimum set of transactions needed to settle all debts.
 * Uses a greedy algorithm: largest debtor pays largest creditor first.
 *
 * @param {string} groupId
 * @returns {Array<{from: string, to: string, amount: number}>}
 *   Ordered list of settlement payments.
 * @example
 *   [{ from: 'Bob', to: 'Alice', amount: 1000 }, ...]
 */
function calculateSettlements(groupId) {
  const balances = calculateBalances(groupId);
  if (Object.keys(balances).length === 0) return [];

  // Split into debtors (negative) and creditors (positive)
  const debtors  = [];
  const creditors = [];

  Object.entries(balances).forEach(([name, balance]) => {
    if (balance < -0.005) debtors.push({ name, amount: -balance });
    if (balance >  0.005) creditors.push({ name, amount: balance });
  });

  // Sort descending so we always match the biggest mover first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor   = debtors[0];
    const creditor = creditors[0];
    const payment  = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from:   debtor.name,
      to:     creditor.name,
      amount: Math.round(payment * 100) / 100,
    });

    debtor.amount   -= payment;
    creditor.amount -= payment;

    if (debtor.amount   < 0.005) debtors.shift();
    if (creditor.amount < 0.005) creditors.shift();
  }

  return settlements;
}

/**
 * Returns the total amount spent in a group across all expenses.
 * @param {string} groupId
 * @returns {number}
 */
function getTotalSpend(groupId) {
  const group = getGroupById(groupId);
  if (!group) return 0;
  return group.expenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Returns how much each member has paid in total (not net — just raw paid).
 * Useful for showing a "who paid most" summary.
 * @param {string} groupId
 * @returns {Object} Map of { memberName: totalPaid }
 */
function getPaidTotals(groupId) {
  const group = getGroupById(groupId);
  if (!group) return {};

  const totals = {};
  group.members.forEach(m => { totals[m] = 0; });
  group.expenses.forEach(e => { totals[e.paidBy] += e.amount; });

  return totals;
}
