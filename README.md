# SplitSpree

> Splitwise but free so you go on a spree

A lightweight expense splitter — pure HTML, CSS, and vanilla JS. No backend, no build step. Data stored in `localStorage`.

**Live:** https://splitspree.github.io  
**Repo:** https://github.com/LF-ICL/splitspree.github.io

---

## File structure

```
splitspree.github.io/
├── index.html            ← markup only, no logic
├── css/
│   ├── main.css          ← global layout & typography
│   └── components.css    ← buttons, cards, modals, forms
├── js/
│   ├── storage.js        ← ALL localStorage read/write
│   ├── groups.js         ← group creation & member management
│   ├── expenses.js       ← expense creation & validation
│   ├── balances.js       ← balance calculations (pure logic, no DOM)
│   └── ui.js             ← DOM rendering & all event wiring
├── pages/                ← future additional pages
├── assets/icons/
└── README.md
```

---

## JS load order (critical)

```html
<script src="js/storage.js"></script>   <!-- no deps -->
<script src="js/groups.js"></script>    <!-- needs storage -->
<script src="js/expenses.js"></script>  <!-- needs storage, groups -->
<script src="js/balances.js"></script>  <!-- needs storage, groups -->
<script src="js/ui.js"></script>        <!-- needs everything above -->
```

Each file exposes plain global functions — no modules, no bundler needed.

---

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Live on GitHub Pages — never push directly |
| `develop` | Integration branch — merge features here |
| `feature/xxx` | One branch per feature, one person per branch |

**Workflow:** `develop` → `feature/xxx` → PR back to `develop` → release to `main`

---

## Data structures

### Group
```json
{
  "id": "1234567890abc",
  "name": "Tokyo trip",
  "members": ["Alice", "Bob", "Charlie"],
  "expenses": []
}
```

### Expense
```json
{
  "id": "1234567891xyz",
  "desc": "Dinner",
  "amount": 5000,
  "paidBy": "Alice"
}
```

---

## Module API reference

### `storage.js`
| Function | Description |
|----------|-------------|
| `getAllGroups()` | Returns all groups from localStorage |
| `saveAllGroups(groups)` | Writes full groups array |
| `getGroupById(id)` | Returns one group or null |
| `saveGroup(group)` | Upserts a single group |
| `deleteGroup(id)` | Removes a group |
| `clearAllData()` | Wipes everything (dev only) |

### `groups.js`
| Function | Description |
|----------|-------------|
| `createGroup(name, members)` | Creates & saves a new group |
| `renameGroup(id, newName)` | Renames a group |
| `addMember(id, name)` | Adds a member to a group |
| `removeMember(id, name)` | Removes a member (blocks if they have expenses) |
| `removeGroup(id)` | Deletes a group entirely |
| `listGroups()` | Returns all groups |

### `expenses.js`
| Function | Description |
|----------|-------------|
| `addExpense(groupId, desc, amount, paidBy)` | Adds a validated expense |
| `editExpense(groupId, expenseId, updates)` | Patches an existing expense |
| `removeExpense(groupId, expenseId)` | Deletes an expense |
| `getExpenses(groupId)` | Returns all expenses for a group |

### `balances.js`
| Function | Description |
|----------|-------------|
| `calculateBalances(groupId)` | Returns `{ member: netBalance }` map |
| `calculateSettlements(groupId)` | Returns minimal `[{from, to, amount}]` list |
| `getTotalSpend(groupId)` | Returns sum of all expense amounts |
| `getPaidTotals(groupId)` | Returns `{ member: totalPaid }` map |

### `ui.js`
| Function | Description |
|----------|-------------|
| `renderGroupList()` | Paints the home screen |
| `renderGroupDetail(id)` | Paints the group detail view |
| `showView(viewId)` | Swaps the active view |
| `navigateHome()` | Goes to home |
| `navigateToGroup(id)` | Goes to a group detail |
| `showMessage(msg, type)` | Shows a toast notification |

---

## Local development

No build step needed. Just open `index.html` in your browser, or use Live Server in VS Code.

---

## Common commands

```bash
gh repo list LF-ICL                         # list org repos
git pull                                    # get latest before working
git checkout -b feature/your-feature-name  # create a feature branch
git add .
git commit -m "feat: your message"
git push origin feature/your-feature-name  # push, then open a PR to develop
```
