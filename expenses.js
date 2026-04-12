/* components.css — buttons, cards, chips, expense/balance/merge rows */

/* ── Buttons ─────────────────────────────────────────────── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.1rem;
  border: none;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition), transform var(--transition), opacity var(--transition);
  white-space: nowrap;
  flex-shrink: 0;
}
.btn:active   { transform: scale(0.97); }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.btn--primary { background: var(--color-primary); color: #fff; }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-d); }

.btn--danger  { background: var(--color-danger); color: #fff; }
.btn--danger:hover:not(:disabled)  { background: var(--color-danger-d); }

.btn--ghost   { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }
.btn--ghost:hover:not(:disabled)   { background: var(--color-bg); }

.btn--sm   { padding: 0.25rem 0.65rem; font-size: 0.8rem; }
.btn--full { width: 100%; }

/* ── Cards ───────────────────────────────────────────────── */

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  box-shadow: var(--shadow);
}

.group-card {
  cursor: pointer;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: box-shadow var(--transition), transform var(--transition);
}
.group-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-1px); }
.group-card__info { flex: 1; min-width: 0; }
.group-card__name {
  font-weight: 600;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.group-card__meta { color: var(--color-muted); font-size: 0.82rem; margin-top: 0.1rem; }

/* ── Chips ───────────────────────────────────────────────── */

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: #e8f5e9;
  color: var(--color-primary);
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 500;
  margin: 0.2rem 0.2rem 0.2rem 0;
}
/* Dummy/guest member chip has a subtle amber tint */
.chip--dummy {
  background: #fff3e0;
  color: var(--color-warning);
  font-size: 0.72rem;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}

/* ── Expense rows ────────────────────────────────────────── */

.expense-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
}
.expense-row:last-child       { border-bottom: none; }
.expense-row__desc            { flex: 2; }
.expense-row__paid-by         { flex: 1; color: var(--color-muted); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.expense-row__amount          { font-weight: 600; white-space: nowrap; }
.expense-row__spacer          { width: 2rem; flex-shrink: 0; }

/* ── Balance rows ────────────────────────────────────────── */

.balance-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--color-border);
}
.balance-row:last-child               { border-bottom: none; }
.balance-row--positive span:last-child { color: var(--color-positive); font-weight: 600; }
.balance-row--negative span:last-child { color: var(--color-danger);   font-weight: 600; }
.balance-row--zero    span:last-child  { color: var(--color-muted); }

/* ── Settlement rows ─────────────────────────────────────── */

.settlement-row {
  padding: 0.4rem 0;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--color-border);
}
.settlement-row:last-child { border-bottom: none; }
.settlement-row strong     { color: var(--color-primary); }

/* ── Merge notification banner ───────────────────────────── */

.merge-banner {
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow);
}
.merge-banner__title {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #5d4037;
}
.merge-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-top: 1px solid #ffe082;
  flex-wrap: wrap;
}
.merge-row__desc {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
  min-width: 200px;
}
.merge-row__actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
