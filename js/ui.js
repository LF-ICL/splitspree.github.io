/**
 * ui.js
 * All DOM rendering and event wiring for SplitSpree.
 * Depends on: storage.js, groups.js, expenses.js, balances.js
 *
 * ── Public render functions ──────────────────────────────────────────────────
 *   renderGroupList()         → paints the home screen group cards
 *   renderGroupDetail(id)     → paints the detail view for one group
 *
 * ── Navigation ───────────────────────────────────────────────────────────────
 *   showView(viewId)          → swaps which #view-* div is visible
 *   navigateToGroup(id)       → shows detail view for a group
 *   navigateHome()            → shows group list view
 */

// ── View management ──────────────────────────────────────────────────────────

/**
 * Hides all views and shows the one with the given id.
 * Views are any element with the class `view` (e.g. #view-home, #view-group).
 * @param {string} viewId - The id of the view element to show.
 */
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
}

function navigateHome() {
  renderGroupList();
  showView('view-home');
}

function navigateToGroup(groupId) {
  renderGroupDetail(groupId);
  showView('view-group');
}

// ── Home view — group list ────────────────────────────────────────────────────

/**
 * Renders all groups as cards into #group-list.
 * Shows an empty-state message if there are no groups.
 */
function renderGroupList() {
  const container = document.getElementById('group-list');
  if (!container) return;

  const groups = listGroups();
  container.innerHTML = '';

  if (groups.length === 0) {
    container.innerHTML = `
      <p class="empty-state">No groups yet. Create one to get started!</p>`;
    return;
  }

  groups.forEach(group => {
    const card = document.createElement('div');
    card.className = 'card group-card';
    card.innerHTML = `
      <h3 class="group-card__name">${escapeHtml(group.name)}</h3>
      <p class="group-card__meta">${group.members.length} members · ${group.expenses.length} expenses</p>
      <button class="btn btn--danger btn--sm delete-group-btn"
              data-id="${group.id}" aria-label="Delete group">Delete</button>
    `;
    card.addEventListener('click', e => {
      // Don't navigate if the delete button was clicked
      if (e.target.closest('.delete-group-btn')) return;
      navigateToGroup(group.id);
    });
    container.appendChild(card);
  });

  // Wire delete buttons
  container.querySelectorAll('.delete-group-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleDeleteGroup(btn.dataset.id);
    });
  });
}

// ── Group detail view ────────────────────────────────────────────────────────

/**
 * Renders the full detail view for a single group:
 * member list, expense list, balance summary, and settlement plan.
 * @param {string} groupId
 */
function renderGroupDetail(groupId) {
  const group = getGroupById(groupId);
  if (!group) { navigateHome(); return; }

  // Store current group id on the view so form handlers can read it
  const view = document.getElementById('view-group');
  if (view) view.dataset.groupId = groupId;

  // Title
  setTextContent('group-title', group.name);

  // Members
  renderMemberList(group);

  // Expenses
  renderExpenseList(group);

  // Balances + settlements
  renderBalanceSummary(groupId);
}

/**
 * Renders the member chip list into #member-list.
 * @param {Object} group
 */
function renderMemberList(group) {
  const container = document.getElementById('member-list');
  if (!container) return;

  container.innerHTML = group.members
    .map(m => `<span class="chip">${escapeHtml(m)}</span>`)
    .join('');
}

/**
 * Renders the expense rows into #expense-list.
 * @param {Object} group
 */
function renderExpenseList(group) {
  const container = document.getElementById('expense-list');
  if (!container) return;

  if (group.expenses.length === 0) {
    container.innerHTML = `<p class="empty-state">No expenses yet.</p>`;
    return;
  }

  container.innerHTML = '';

  group.expenses.forEach(expense => {
    const row = document.createElement('div');
    row.className = 'expense-row';
    row.innerHTML = `
      <span class="expense-row__desc">${escapeHtml(expense.desc)}</span>
      <span class="expense-row__paid-by">${escapeHtml(expense.paidBy)}</span>
      <span class="expense-row__amount">${formatCurrency(expense.amount)}</span>
      <button class="btn btn--danger btn--sm"
              data-id="${expense.id}" aria-label="Delete expense">✕</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      handleDeleteExpense(group.id, expense.id);
    });
    container.appendChild(row);
  });
}

/**
 * Renders the net balance list and settlement plan into
 * #balance-list and #settlement-list.
 * @param {string} groupId
 */
function renderBalanceSummary(groupId) {
  const balances    = calculateBalances(groupId);
  const settlements = calculateSettlements(groupId);

  // Net balances
  const balanceContainer = document.getElementById('balance-list');
  if (balanceContainer) {
    balanceContainer.innerHTML = Object.entries(balances)
      .map(([name, bal]) => {
        const cls = bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'zero';
        const label = bal > 0 ? `gets back ${formatCurrency(bal)}`
                    : bal < 0 ? `owes ${formatCurrency(-bal)}`
                    : 'settled up';
        return `<div class="balance-row balance-row--${cls}">
                  <span>${escapeHtml(name)}</span>
                  <span>${label}</span>
                </div>`;
      }).join('');
  }

  // Settlement plan
  const settlementContainer = document.getElementById('settlement-list');
  if (settlementContainer) {
    if (settlements.length === 0) {
      settlementContainer.innerHTML = `<p class="empty-state">Everyone is settled up! 🎉</p>`;
    } else {
      settlementContainer.innerHTML = settlements
        .map(s => `<div class="settlement-row">
                     ${escapeHtml(s.from)} → ${escapeHtml(s.to)}:
                     <strong>${formatCurrency(s.amount)}</strong>
                   </div>`)
        .join('');
    }
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

/**
 * Handles the Create Group form submission.
 * Reads #new-group-name and #new-group-members from the DOM.
 */
function handleCreateGroup() {
  const nameInput    = document.getElementById('new-group-name');
  const membersInput = document.getElementById('new-group-members');

  const name    = nameInput ? nameInput.value : '';
  const members = membersInput
    ? membersInput.value.split(',').map(m => m.trim()).filter(Boolean)
    : [];

  try {
    createGroup(name, members);
    if (nameInput)    nameInput.value    = '';
    if (membersInput) membersInput.value = '';
    renderGroupList();
    showMessage('Group created!', 'success');
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

/**
 * Handles the Add Expense form submission inside a group detail view.
 */
function handleAddExpense() {
  const view = document.getElementById('view-group');
  const groupId = view ? view.dataset.groupId : null;
  if (!groupId) return;

  const descInput   = document.getElementById('new-expense-desc');
  const amountInput = document.getElementById('new-expense-amount');
  const paidByInput = document.getElementById('new-expense-paid-by');

  const desc   = descInput   ? descInput.value   : '';
  const amount = amountInput ? amountInput.value  : '';
  const paidBy = paidByInput ? paidByInput.value  : '';

  try {
    addExpense(groupId, desc, amount, paidBy);
    if (descInput)   descInput.value   = '';
    if (amountInput) amountInput.value = '';
    renderGroupDetail(groupId);
    showMessage('Expense added!', 'success');
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

/**
 * Handles group deletion with a confirmation prompt.
 * @param {string} groupId
 */
function handleDeleteGroup(groupId) {
  const group = getGroupById(groupId);
  if (!group) return;
  if (!confirm(`Delete "${group.name}" and all its expenses? This cannot be undone.`)) return;
  removeGroup(groupId);
  renderGroupList();
}

/**
 * Handles expense deletion with a confirmation prompt.
 * @param {string} groupId
 * @param {string} expenseId
 */
function handleDeleteExpense(groupId, expenseId) {
  if (!confirm('Delete this expense?')) return;
  try {
    removeExpense(groupId, expenseId);
    renderGroupDetail(groupId);
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

// ── Utility helpers ───────────────────────────────────────────────────────────

/**
 * Displays a temporary toast/status message.
 * Looks for a #status-msg element; creates one if absent.
 * @param {string} message
 * @param {'success'|'error'} type
 */
function showMessage(message, type = 'success') {
  let el = document.getElementById('status-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'status-msg';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `status-msg status-msg--${type} status-msg--visible`;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('status-msg--visible'), 3000);
}

/**
 * Safely sets the text content of an element by id.
 * @param {string} id
 * @param {string} text
 */
function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Escapes HTML special characters to prevent XSS when inserting user text.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

/**
 * Formats a number as a plain currency string (e.g. 1234.5 → "¥1,235").
 * Adjust locale and currency as needed for your target region.
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Wires all static button event listeners once the DOM is ready.
 * Called automatically on DOMContentLoaded.
 */
function initUI() {
  // Home: create group button
  const createGroupBtn = document.getElementById('create-group-btn');
  if (createGroupBtn) createGroupBtn.addEventListener('click', handleCreateGroup);

  // Group detail: add expense button
  const addExpenseBtn = document.getElementById('add-expense-btn');
  if (addExpenseBtn) addExpenseBtn.addEventListener('click', handleAddExpense);

  // Group detail: back button
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', navigateHome);

  // Start on the home view
  navigateHome();
}

document.addEventListener('DOMContentLoaded', initUI);
