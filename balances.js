/**
 * ui.js
 * All DOM rendering and event wiring for SplitSpree.
 * Handles auth views (register/login), group list, group detail,
 * and the dummy-member merge notification panel.
 *
 * Depends on: supabase.js, auth.js, groups.js, expenses.js, balances.js
 *
 * ── Views ────────────────────────────────────────────────────────────────────
 *   view-auth          register / login forms (shown when not logged in)
 *   view-home          group list + create group form
 *   view-group         group detail: members, expenses, balances, settle-up
 *
 * ── Navigation ───────────────────────────────────────────────────────────────
 *   showView(id)
 *   navigateHome()
 *   navigateToGroup(id)
 */

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Entry point. Called on DOMContentLoaded.
 * Handles the email-link redirect first, then decides which view to show.
 */
async function initUI() {
  showLoadingOverlay(true);

  // 1. Handle magic-link / verification redirect if present in URL
  const wasRedirect = await handleAuthRedirect();

  // 2. Check whether we already have a session
  const user = await getCurrentUser();

  showLoadingOverlay(false);

  if (user) {
    await navigateHome();
    if (wasRedirect) showMessage(`Welcome, ${user.username}! 🎉`, 'success');
  } else {
    showView('view-auth');
    if (wasRedirect) showMessage('Something went wrong with the verification link. Please try again.', 'error');
  }

  wireStaticButtons();
}

document.addEventListener('DOMContentLoaded', initUI);

// ── View management ────────────────────────────────────────────────────────────

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
}

async function navigateHome() {
  await renderHomeView();
  showView('view-home');
}

async function navigateToGroup(groupId) {
  await renderGroupDetail(groupId);
  showView('view-group');
}

// ── Auth view ─────────────────────────────────────────────────────────────────

/**
 * Toggles between the Register and Login panels within view-auth.
 * @param {'register'|'login'} mode
 */
function switchAuthMode(mode) {
  const reg = document.getElementById('auth-register-panel');
  const log = document.getElementById('auth-login-panel');
  const title = document.getElementById('auth-title');
  if (mode === 'register') {
    reg.classList.remove('hidden');
    log.classList.add('hidden');
    title.textContent = 'Create account';
  } else {
    log.classList.remove('hidden');
    reg.classList.add('hidden');
    title.textContent = 'Sign in';
  }
}

async function handleRegister() {
  const username = document.getElementById('reg-username')?.value || '';
  const email    = document.getElementById('reg-email')?.value    || '';

  setButtonLoading('reg-submit-btn', true);
  const result = await registerUser(username, email);
  setButtonLoading('reg-submit-btn', false);

  showMessage(result.message, result.ok ? 'success' : 'error');
}

async function handleLogin() {
  const email = document.getElementById('login-email')?.value || '';

  setButtonLoading('login-submit-btn', true);
  const result = await loginUser(email);
  setButtonLoading('login-submit-btn', false);

  showMessage(result.message, result.ok ? 'success' : 'error');
}

async function handleLogout() {
  await logoutUser();
  showView('view-auth');
  showMessage('You have been signed out.', 'success');
}

// ── Home view ─────────────────────────────────────────────────────────────────

async function renderHomeView() {
  const user = await getCurrentUser();
  if (!user) { showView('view-auth'); return; }

  setTextContent('home-username', user.username);

  await renderGroupList();
  await renderMergeNotifications();
}

async function renderGroupList() {
  const container = document.getElementById('group-list');
  if (!container) return;

  container.innerHTML = '<p class="loading-text">Loading groups…</p>';
  const groups = await listGroups();
  container.innerHTML = '';

  if (groups.length === 0) {
    container.innerHTML = '<p class="empty-state">No groups yet. Create one below!</p>';
    return;
  }

  groups.forEach(group => {
    const card = document.createElement('div');
    card.className = 'card group-card';
    const memberCount  = group.group_members?.length || 0;
    card.innerHTML = `
      <div class="group-card__info">
        <h3 class="group-card__name">${escapeHtml(group.name)}</h3>
        <p class="group-card__meta">${memberCount} member${memberCount !== 1 ? 's' : ''}</p>
      </div>
      <button class="btn btn--danger btn--sm delete-group-btn"
              data-id="${group.id}" aria-label="Delete group">Delete</button>
    `;
    card.addEventListener('click', e => {
      if (e.target.closest('.delete-group-btn')) return;
      navigateToGroup(group.id);
    });
    container.appendChild(card);
  });

  container.querySelectorAll('.delete-group-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleDeleteGroup(btn.dataset.id);
    });
  });
}

async function handleCreateGroup() {
  const nameInput    = document.getElementById('new-group-name');
  const membersInput = document.getElementById('new-group-members');
  const name    = nameInput?.value || '';
  const members = (membersInput?.value || '')
    .split(',').map(m => m.trim()).filter(Boolean);

  setButtonLoading('create-group-btn', true);
  const result = await createGroup(name, members);
  setButtonLoading('create-group-btn', false);

  if (result.ok) {
    if (nameInput)    nameInput.value    = '';
    if (membersInput) membersInput.value = '';
    showMessage('Group created!', 'success');
    await renderGroupList();
  } else {
    showMessage(result.message, 'error');
  }
}

async function handleDeleteGroup(groupId) {
  const groups = await listGroups();
  const group  = groups.find(g => g.id === groupId);
  if (!group) return;
  if (!confirm(`Delete "${group.name}" and all its expenses? This cannot be undone.`)) return;

  const result = await removeGroup(groupId);
  showMessage(result.message, result.ok ? 'success' : 'error');
  if (result.ok) await renderGroupList();
}

// ── Merge notification panel ──────────────────────────────────────────────────

/**
 * Renders a notification banner if there are pending dummy-merge proposals
 * for groups the current user owns.
 */
async function renderMergeNotifications() {
  const container = document.getElementById('merge-notifications');
  if (!container) return;

  const merges = await getPendingMerges();
  container.innerHTML = '';

  if (merges.length === 0) return;

  const banner = document.createElement('div');
  banner.className = 'merge-banner';
  banner.innerHTML = `<h3 class="merge-banner__title">👋 Member match${merges.length > 1 ? 'es' : ''} found</h3>`;

  merges.forEach(merge => {
    const dummyName   = merge.group_members?.display_name || '(unknown)';
    const newUsername = merge.profiles?.username          || '(unknown)';
    const groupName   = merge.groups?.name                || '(unknown group)';

    const row = document.createElement('div');
    row.className = 'merge-row';
    row.innerHTML = `
      <p class="merge-row__desc">
        <strong>${escapeHtml(newUsername)}</strong> just registered.
        Merge with dummy member <strong>${escapeHtml(dummyName)}</strong>
        in <em>${escapeHtml(groupName)}</em>?
      </p>
      <div class="merge-row__actions">
        <button class="btn btn--primary btn--sm accept-merge" data-id="${merge.id}">Merge</button>
        <button class="btn btn--ghost btn--sm dismiss-merge"  data-id="${merge.id}">Dismiss</button>
      </div>
    `;
    banner.appendChild(row);
  });

  container.appendChild(banner);

  container.querySelectorAll('.accept-merge').forEach(btn => {
    btn.addEventListener('click', async () => {
      const result = await acceptMerge(btn.dataset.id);
      showMessage(result.message, result.ok ? 'success' : 'error');
      await renderMergeNotifications();
    });
  });

  container.querySelectorAll('.dismiss-merge').forEach(btn => {
    btn.addEventListener('click', async () => {
      const result = await dismissMerge(btn.dataset.id);
      showMessage(result.message, result.ok ? 'success' : 'error');
      await renderMergeNotifications();
    });
  });
}

// ── Group detail view ─────────────────────────────────────────────────────────

async function renderGroupDetail(groupId) {
  const view = document.getElementById('view-group');
  if (view) view.dataset.groupId = groupId;

  const group = await getGroup(groupId);
  if (!group) { await navigateHome(); return; }

  setTextContent('group-title', group.name);
  renderMemberChips(group);
  populatePaidByDropdown(group);
  await renderExpenseList(groupId, group);
  await renderBalanceSummary(groupId, group);
}

function renderMemberChips(group) {
  const container = document.getElementById('member-list');
  if (!container) return;

  container.innerHTML = (group.group_members || [])
    .map(m => {
      const tag = m.is_dummy ? ' <span class="chip chip--dummy">guest</span>' : '';
      return `<span class="chip">${escapeHtml(m.display_name)}${tag}</span>`;
    }).join('');
}

/**
 * Populates the "Paid by" <select> with current group members.
 */
function populatePaidByDropdown(group) {
  const select = document.getElementById('new-expense-paid-by');
  if (!select) return;

  select.innerHTML = '<option value="">— Who paid? —</option>';
  (group.group_members || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value       = m.id;
    opt.textContent = m.display_name + (m.is_dummy ? ' (guest)' : '');
    select.appendChild(opt);
  });
}

async function renderExpenseList(groupId, group) {
  const container = document.getElementById('expense-list');
  if (!container) return;

  container.innerHTML = '<p class="loading-text">Loading…</p>';
  const expenses = await getExpenses(groupId);
  container.innerHTML = '';

  const user = await getCurrentUser();

  if (expenses.length === 0) {
    container.innerHTML = '<p class="empty-state">No expenses yet.</p>';
    return;
  }

  expenses.forEach(expense => {
    const payer     = expense.group_members?.display_name || '?';
    const canDelete = expense.created_by === user?.id;

    const row = document.createElement('div');
    row.className = 'expense-row';
    row.innerHTML = `
      <span class="expense-row__desc">${escapeHtml(expense.description)}</span>
      <span class="expense-row__paid-by">${escapeHtml(payer)}</span>
      <span class="expense-row__amount">${formatCurrency(expense.amount)}</span>
      ${canDelete
        ? `<button class="btn btn--danger btn--sm" data-id="${expense.id}" aria-label="Delete expense">✕</button>`
        : '<span class="expense-row__spacer"></span>'}
    `;
    if (canDelete) {
      row.querySelector('button').addEventListener('click', () => {
        handleDeleteExpense(groupId, expense.id);
      });
    }
    container.appendChild(row);
  });
}

async function handleAddExpense() {
  const view    = document.getElementById('view-group');
  const groupId = view?.dataset.groupId;
  if (!groupId) return;

  const desc     = document.getElementById('new-expense-desc')?.value    || '';
  const amount   = document.getElementById('new-expense-amount')?.value  || '';
  const memberId = document.getElementById('new-expense-paid-by')?.value || '';

  setButtonLoading('add-expense-btn', true);
  const result = await addExpense(groupId, desc, amount, memberId);
  setButtonLoading('add-expense-btn', false);

  if (result.ok) {
    document.getElementById('new-expense-desc').value  = '';
    document.getElementById('new-expense-amount').value = '';
    document.getElementById('new-expense-paid-by').value = '';
    showMessage('Expense added!', 'success');
    await renderGroupDetail(groupId);
  } else {
    showMessage(result.message, 'error');
  }
}

async function handleDeleteExpense(groupId, expenseId) {
  if (!confirm('Delete this expense?')) return;
  const result = await removeExpense(expenseId);
  showMessage(result.message, result.ok ? 'success' : 'error');
  if (result.ok) await renderGroupDetail(groupId);
}

async function handleAddDummy() {
  const view    = document.getElementById('view-group');
  const groupId = view?.dataset.groupId;
  if (!groupId) return;

  const input = document.getElementById('new-dummy-name');
  const name  = input?.value || '';

  const result = await addDummyMember(groupId, name);
  showMessage(result.message || (result.ok ? 'Guest added.' : 'Error'), result.ok ? 'success' : 'error');

  if (result.ok) {
    if (input) input.value = '';
    await renderGroupDetail(groupId);
  }
}

// ── Balance & settle-up ───────────────────────────────────────────────────────

async function renderBalanceSummary(groupId, group) {
  const expenses = await getExpenses(groupId);
  const members  = group.group_members || [];

  const balances    = calculateBalances(members, expenses);
  const settlements = calculateSettlements(balances);

  const balanceContainer = document.getElementById('balance-list');
  if (balanceContainer) {
    balanceContainer.innerHTML = Object.entries(balances)
      .map(([name, bal]) => {
        const cls   = bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'zero';
        const label = bal > 0 ? `gets back ${formatCurrency(bal)}`
                    : bal < 0 ? `owes ${formatCurrency(-bal)}`
                    : 'settled up ✓';
        return `<div class="balance-row balance-row--${cls}">
                  <span>${escapeHtml(name)}</span><span>${label}</span>
                </div>`;
      }).join('');
  }

  const settlementContainer = document.getElementById('settlement-list');
  if (settlementContainer) {
    settlementContainer.innerHTML = settlements.length === 0
      ? '<p class="empty-state">Everyone is settled up! 🎉</p>'
      : settlements.map(s =>
          `<div class="settlement-row">
             ${escapeHtml(s.from)} → ${escapeHtml(s.to)}:
             <strong>${formatCurrency(s.amount)}</strong>
           </div>`
        ).join('');
  }
}

// ── Static button wiring ──────────────────────────────────────────────────────

function wireStaticButtons() {
  document.getElementById('reg-submit-btn')    ?.addEventListener('click', handleRegister);
  document.getElementById('login-submit-btn')  ?.addEventListener('click', handleLogin);
  document.getElementById('logout-btn')        ?.addEventListener('click', handleLogout);
  document.getElementById('create-group-btn')  ?.addEventListener('click', handleCreateGroup);
  document.getElementById('add-expense-btn')   ?.addEventListener('click', handleAddExpense);
  document.getElementById('add-dummy-btn')     ?.addEventListener('click', handleAddDummy);
  document.getElementById('back-btn')          ?.addEventListener('click', navigateHome);

  document.getElementById('show-login-link')   ?.addEventListener('click', () => switchAuthMode('login'));
  document.getElementById('show-register-link')?.addEventListener('click', () => switchAuthMode('register'));

  // Allow Enter key on email inputs to submit
  document.getElementById('reg-email')   ?.addEventListener('keydown', e => e.key === 'Enter' && handleRegister());
  document.getElementById('login-email') ?.addEventListener('keydown', e => e.key === 'Enter' && handleLogin());
}

// ── Utility helpers ───────────────────────────────────────────────────────────

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
  el._timeout = setTimeout(() => el.classList.remove('status-msg--visible'), 4000);
}

function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency', currency: 'JPY', maximumFractionDigits: 0,
  }).format(amount);
}

function setButtonLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.origText = btn.dataset.origText || btn.textContent;
  btn.textContent = loading ? 'Please wait…' : btn.dataset.origText;
}

function showLoadingOverlay(show) {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.toggle('hidden', !show);
}
