# SplitSpree

> Splitwise but free so you go on a spree

A lightweight expense splitter with user auth and server-side storage.
Pure HTML, CSS, and vanilla JS frontend. Supabase (PostgreSQL + Auth) backend.

**Live:** https://splitspree.github.io  
**Repo:** https://github.com/LF-ICL/splitspree.github.io

---

## First-time setup

### 1. Create a Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New project**
3. Choose a name (e.g. `splitspree`), set a database password, pick a region close to you
4. Wait ~2 minutes for the project to spin up

### 2. Run the database schema

1. In your Supabase dashboard, go to **SQL Editor → New query**
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run** — you should see "Success. No rows returned"

### 3. Configure email redirect URL

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to `https://splitspree.github.io`
3. Under **Redirect URLs**, add `https://splitspree.github.io`
4. For local dev, also add `http://localhost:5500` (or whatever port you use)

### 4. Add your Supabase credentials

1. Go to **Project Settings → API**
2. Copy your **Project URL** and **anon/public** key
3. Open `js/supabase.js` and replace:
   ```js
   const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```

### 5. Deploy

```bash
git add .
git commit -m "feat: add Supabase auth and server-side storage"
git push origin main
```

---

## File structure

```
splitspree.github.io/
├── index.html              ← markup: auth view, home view, group detail view
├── supabase_schema.sql     ← run once in Supabase SQL editor to set up DB
├── css/
│   ├── main.css            ← global layout, auth, loading overlay
│   └── components.css      ← buttons, cards, chips, merge banner
├── js/
│   ├── supabase.js         ← Supabase client init (set your keys here)
│   ├── auth.js             ← register, login, logout, session, merge queue
│   ├── groups.js           ← group + member CRUD via Supabase
│   ├── expenses.js         ← expense CRUD via Supabase
│   ├── balances.js         ← pure math: balances + settlements (no network)
│   └── ui.js               ← all DOM rendering and event wiring
├── pages/                  ← future additional pages
├── assets/icons/
└── README.md
```

---

## JS load order (critical)

```html
<script src="js/supabase.js"></script>   <!-- Supabase client — no deps -->
<script src="js/auth.js"></script>       <!-- needs supabase.js -->
<script src="js/groups.js"></script>     <!-- needs supabase.js, auth.js -->
<script src="js/expenses.js"></script>   <!-- needs supabase.js, auth.js -->
<script src="js/balances.js"></script>   <!-- pure math, no deps -->
<script src="js/ui.js"></script>         <!-- needs everything above -->
```

---

## Database schema

| Table | Purpose |
|-------|---------|
| `profiles` | One row per registered user (linked to Supabase auth) |
| `groups` | Expense groups |
| `group_members` | Members of each group — real or dummy |
| `expenses` | Individual expense records |
| `dummy_merge_queue` | Pending merge proposals when a dummy name registers |

Row-Level Security is enabled on all tables — users can only see and edit data for groups they belong to.

---

## Auth flow

**Register:** User enters username + email → receives verification email → clicks link → auto-logged in, profile created.

**Login (new device):** User enters email only → receives magic-link → clicks link → auto-logged in. No password needed.

**Session:** Stored in a cookie (30-day expiry). Works across page reloads and devices.

---

## Dummy member merging

When a registered user creates a group and adds members by name, any name that doesn't match a registered account becomes a **guest (dummy) member**.

When a new user registers with a username matching an existing dummy name, the group creator sees a **merge notification** on their home screen. They can accept (linking the real account to that member's history) or dismiss (keeping them separate).

---

## Module API reference

### `auth.js`
| Function | Description |
|----------|-------------|
| `registerUser(username, email)` | Sends verification email |
| `loginUser(email)` | Sends magic-link login email |
| `logoutUser()` | Signs out |
| `getCurrentUser()` | Returns `{id, username, email}` or null |
| `getSession()` | Returns raw Supabase session |
| `handleAuthRedirect()` | Call on page load to process email link |
| `getPendingMerges()` | Returns unresolved merge proposals |
| `acceptMerge(mergeId)` | Links dummy to real profile |
| `dismissMerge(mergeId)` | Marks proposal dismissed |

### `groups.js`
| Function | Description |
|----------|-------------|
| `listGroups()` | All groups the current user is in |
| `getGroup(id)` | Single group with members |
| `createGroup(name, memberNames[])` | Creates group, adds current user + others |
| `renameGroup(id, name)` | Renames (owner only) |
| `removeGroup(id)` | Deletes group + all data (owner only) |
| `addDummyMember(groupId, name)` | Adds a guest member |
| `removeMember(groupId, memberId)` | Removes member (blocked if has expenses) |

### `expenses.js`
| Function | Description |
|----------|-------------|
| `getExpenses(groupId)` | All expenses for a group |
| `addExpense(groupId, desc, amount, memberId)` | Creates validated expense |
| `editExpense(expenseId, updates)` | Patches description/amount/payer |
| `removeExpense(expenseId)` | Deletes expense (creator only) |

### `balances.js`
| Function | Description |
|----------|-------------|
| `calculateBalances(members, expenses)` | Returns `{name: netBalance}` |
| `calculateSettlements(balances)` | Returns `[{from, to, amount}]` |
| `getTotalSpend(expenses)` | Sum of all amounts |
| `getPaidTotals(members, expenses)` | Returns `{name: totalPaid}` |

---

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Live on GitHub Pages — never push directly |
| `develop` | Integration branch |
| `feature/xxx` | One branch per feature |

**Workflow:** `develop` → `feature/xxx` → PR back to `develop` → release to `main`

---

## Common commands

```bash
git pull
git checkout -b feature/your-feature-name
git add .
git commit -m "feat: your message"
git push origin feature/your-feature-name
# then open a PR to develop on GitHub
```
