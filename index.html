<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SplitSpree</title>
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/components.css" />
  <!-- Supabase JS SDK (UMD build — exposes global `supabase`) -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
</head>
<body>

  <!-- ── Loading overlay (shown on first paint while session loads) ── -->
  <div id="loading-overlay">
    <div class="loading-spinner"></div>
    <p>Loading SplitSpree…</p>
  </div>

  <!-- ══════════════════════════════════════════════════════════ -->
  <!-- VIEW 1: Auth — register / login                           -->
  <!-- ══════════════════════════════════════════════════════════ -->
  <div id="view-auth" class="view">
    <header class="app-header app-header--centered">
      <h1 class="app-title">SplitSpree</h1>
      <p class="app-tagline">Splitwise but free so you go on a spree</p>
    </header>

    <div class="auth-card card">
      <h2 id="auth-title">Create account</h2>

      <!-- Register panel -->
      <div id="auth-register-panel">
        <div class="form-stack">
          <input id="reg-username" type="text"  placeholder="Username (e.g. Alice)" autocomplete="username" />
          <input id="reg-email"    type="email" placeholder="Email address"         autocomplete="email" />
          <button id="reg-submit-btn" class="btn btn--primary btn--full">Send verification email</button>
        </div>
        <p class="auth-switch">Already registered?
          <a href="#" id="show-login-link">Sign in instead</a>
        </p>
      </div>

      <!-- Login panel -->
      <div id="auth-login-panel" class="hidden">
        <div class="form-stack">
          <input id="login-email" type="email" placeholder="Email address" autocomplete="email" />
          <button id="login-submit-btn" class="btn btn--primary btn--full">Send login link</button>
        </div>
        <p class="auth-switch">New here?
          <a href="#" id="show-register-link">Create an account</a>
        </p>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════ -->
  <!-- VIEW 2: Home — group list                                 -->
  <!-- ══════════════════════════════════════════════════════════ -->
  <div id="view-home" class="view">
    <header class="app-header">
      <h1 class="app-title">SplitSpree</h1>
      <div class="app-header__user">
        <span id="home-username" class="username-badge"></span>
        <button id="logout-btn" class="btn btn--ghost btn--sm">Sign out</button>
      </div>
    </header>

    <!-- Pending dummy-merge notifications -->
    <div id="merge-notifications"></div>

    <section class="section">
      <h2>Create a Group</h2>
      <div class="form-stack form-stack--row">
        <input id="new-group-name"    type="text" placeholder="Group name (e.g. Tokyo trip)" />
        <input id="new-group-members" type="text" placeholder="Other members, comma-separated (optional)" />
        <button id="create-group-btn" class="btn btn--primary">Create</button>
      </div>
      <p class="hint">Members you list will be added as guests if they haven't registered yet.</p>
    </section>

    <section class="section">
      <h2>Your Groups</h2>
      <div id="group-list"></div>
    </section>
  </div>

  <!-- ══════════════════════════════════════════════════════════ -->
  <!-- VIEW 3: Group detail                                      -->
  <!-- ══════════════════════════════════════════════════════════ -->
  <div id="view-group" class="view">
    <header class="app-header">
      <button id="back-btn" class="btn btn--ghost">← Back</button>
      <h1 id="group-title" class="app-title"></h1>
    </header>

    <section class="section">
      <h2>Members</h2>
      <div id="member-list"></div>
      <details class="add-dummy-toggle">
        <summary>Add a guest member</summary>
        <div class="form-stack form-stack--row" style="margin-top:0.75rem">
          <input id="new-dummy-name" type="text" placeholder="Guest name (e.g. Bob)" />
          <button id="add-dummy-btn" class="btn btn--primary btn--sm">Add guest</button>
        </div>
        <p class="hint">Guests can be merged with a registered account later.</p>
      </details>
    </section>

    <section class="section">
      <h2>Add Expense</h2>
      <div class="form-stack form-stack--row">
        <input id="new-expense-desc"   type="text"   placeholder="Description (e.g. Dinner)" />
        <input id="new-expense-amount" type="number" placeholder="Amount" min="0" step="any" />
        <select id="new-expense-paid-by">
          <option value="">— Who paid? —</option>
        </select>
        <button id="add-expense-btn" class="btn btn--primary">Add</button>
      </div>
    </section>

    <section class="section">
      <h2>Expenses</h2>
      <div id="expense-list"></div>
    </section>

    <section class="section">
      <h2>Balances</h2>
      <div id="balance-list"></div>
    </section>

    <section class="section">
      <h2>Settle Up</h2>
      <div id="settlement-list"></div>
    </section>
  </div>

  <!-- JS — load order matters -->
  <script src="js/supabase.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/groups.js"></script>
  <script src="js/expenses.js"></script>
  <script src="js/balances.js"></script>
  <script src="js/ui.js"></script>

</body>
</html>
