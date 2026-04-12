/**
 * balances.js
 * Pure balance and settlement calculations for SplitSpree.
 * No DOM access, no Supabase calls — data-in, data-out only.
 *
 * The function signatures changed from the localStorage version:
 * instead of accepting a groupId and fetching internally, these functions
 * accept the already-fetched members and expenses arrays. This keeps the
 * logic fully testable and decoupled from the network layer.
 *
 * ── Public API ──────────────────────────────────────────────────────────────
 *   calculateBalances(members, expenses)    → { displayName: netBalance }
 *   calculateSettlements(balances)          → [{from, to, amount}]
 *   getTotalSpend(expenses)                 → number
 *   getPaidTotals(members, expenses)        → { displayName: totalPaid }
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Calculates the net balance for each member.
 * Positive  = this person is owed money by others.
 * Negative  = this person owes money to others.
 * Expenses are split equally among all members.
 *
 * @param {Array}  members  - group_members rows: [{ id, display_name, ... }]
 * @param {Array}  expenses - expense rows:       [{ amount, group_members: { display_name } }]
 * @returns {Object} { displayName: netBalance }
 *
 * @example
 *   // Alice paid 3000, Bob paid 0, Charlie paid 0, 3 members
 *   // → { Alice: 2000, Bob: -1000, Charlie: -1000 }
 */
function calculateBalances(members, expenses) {
  if (!members.length) return {};

  // Initialise every member at zero
  const balances = {};
  members.forEach(m => { balances[m.display_name] = 0; });

  expenses.forEach(expense => {
    const payerName = expense.group_members?.display_name;
    if (!payerName || balances[payerName] === undefined) return;

    const share = expense.amount / members.length;

    // Payer gets credit for the full amount paid
    balances[payerName] += expense.amount;

    // Everyone (including the payer) owes their equal share
    members.forEach(m => {
      balances[m.display_name] -= share;
    });
  });

  // Round to 2 decimal places to prevent floating-point drift
  Object.keys(balances).forEach(name => {
    balances[name] = Math.round(balances[name] * 100) / 100;
  });

  return balances;
}

/**
 * Calculates the minimal set of payments needed to settle all debts.
 * Uses a greedy algorithm: largest debtor pays largest creditor first.
 *
 * @param {Object} balances - Output of calculateBalances()
 * @returns {Array<{from: string, to: string, amount: number}>}
 *
 * @example
 *   calculateSettlements({ Alice: 2000, Bob: -1000, Charlie: -1000 })
 *   // → [{ from: 'Bob', to: 'Alice', amount: 1000 },
 *   //    { from: 'Charlie', to: 'Alice', amount: 1000 }]
 */
function calculateSettlements(balances) {
  const debtors   = [];
  const creditors = [];

  Object.entries(balances).forEach(([name, balance]) => {
    if (balance < -0.005) debtors.push({ name, amount: -balance });
    if (balance >  0.005) creditors.push({ name, amount: balance });
  });

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
 * Returns the sum of all expense amounts.
 * @param {Array} expenses
 * @returns {number}
 */
function getTotalSpend(expenses) {
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}

/**
 * Returns how much each member has paid in total (raw paid, not net).
 * Useful for "who paid most" summaries.
 *
 * @param {Array} members
 * @param {Array} expenses
 * @returns {Object} { displayName: totalPaid }
 */
function getPaidTotals(members, expenses) {
  const totals = {};
  members.forEach(m => { totals[m.display_name] = 0; });
  expenses.forEach(e => {
    const name = e.group_members?.display_name;
    if (name && totals[name] !== undefined) totals[name] += Number(e.amount);
  });
  return totals;
}
