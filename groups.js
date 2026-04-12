/**
 * auth.js
 * All authentication logic for SplitSpree.
 * Handles registration, email verification redirect, login, logout,
 * session retrieval, and dummy-member merge proposals.
 *
 * Depends on: supabase.js (must be loaded first)
 *
 * ── Public API ──────────────────────────────────────────────────────────────
 *   registerUser(username, email)    → sends verification email
 *   loginUser(email)                 → sends magic-link login email
 *   logoutUser()                     → signs out, clears session
 *   getCurrentUser()                 → returns { id, username, email } or null
 *   getSession()                     → returns raw Supabase session or null
 *   handleAuthRedirect()             → call on page load to catch email link
 *   getPendingMerges()               → returns unresolved dummy merge proposals
 *   acceptMerge(mergeId)             → replaces dummy with real profile
 *   dismissMerge(mergeId)            → marks proposal dismissed
 * ────────────────────────────────────────────────────────────────────────────
 */

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Registers a new user. Sends a verification email with a magic link.
 * The link will redirect back to the app and auto-log them in (handled by
 * handleAuthRedirect() called on page load).
 *
 * @param {string} username - Display name chosen by the user.
 * @param {string} email
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function registerUser(username, email) {
  const trimUser  = username.trim();
  const trimEmail = email.trim().toLowerCase();

  if (!trimUser)  return { ok: false, message: 'Username cannot be empty.' };
  if (!trimEmail) return { ok: false, message: 'Email cannot be empty.' };
  if (!isValidEmail(trimEmail)) return { ok: false, message: 'Please enter a valid email address.' };

  const { error } = await _sb.auth.signUp({
    email:    trimEmail,
    password: generatePassword(),   // auto-generated; user authenticates via email link
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname,
      data: { username: trimUser },
    },
  });

  if (error) return { ok: false, message: friendlyAuthError(error) };
  return { ok: true, message: `Verification email sent to ${trimEmail}. Click the link to activate your account.` };
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Sends a magic-link login email to a registered address.
 * No password needed — the link auto-logs them in via handleAuthRedirect().
 *
 * @param {string} email
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function loginUser(email) {
  const trimEmail = email.trim().toLowerCase();
  if (!isValidEmail(trimEmail)) return { ok: false, message: 'Please enter a valid email address.' };

  const { error } = await _sb.auth.signInWithOtp({
    email: trimEmail,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });

  if (error) return { ok: false, message: friendlyAuthError(error) };
  return { ok: true, message: `Login link sent to ${trimEmail}. Check your inbox.` };
}

// ── Logout ────────────────────────────────────────────────────────────────────

/**
 * Signs the current user out and clears their session cookie.
 * @returns {Promise<void>}
 */
async function logoutUser() {
  await _sb.auth.signOut();
}

// ── Session ───────────────────────────────────────────────────────────────────

/**
 * Returns the currently logged-in user's profile, or null if not logged in.
 * Fetches from the `profiles` table (not just auth metadata).
 * @returns {Promise<{id: string, username: string, email: string}|null>}
 */
async function getCurrentUser() {
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) return null;

  const { data: profile, error } = await _sb
    .from('profiles')
    .select('id, username, email')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) return null;
  return profile;
}

/**
 * Returns the raw Supabase session object, or null.
 * Useful for checking whether the user is authenticated before DB calls.
 * @returns {Promise<Object|null>}
 */
async function getSession() {
  const { data: { session } } = await _sb.auth.getSession();
  return session;
}

// ── Auth redirect handler ─────────────────────────────────────────────────────

/**
 * Must be called once on every page load.
 * Detects if the URL contains an auth callback token (from the email link),
 * completes the sign-in, then cleans up the URL so the token isn't exposed.
 *
 * @returns {Promise<boolean>} true if a redirect was processed (new login/signup)
 */
async function handleAuthRedirect() {
  // Supabase puts tokens in the URL hash after a magic link click
  const hash = window.location.hash;
  if (!hash.includes('access_token') && !hash.includes('error_description')) {
    return false;
  }

  const { data, error } = await _sb.auth.getSession();

  // Clean the token from the URL immediately
  window.history.replaceState(null, '', window.location.pathname);

  if (error) {
    console.error('auth redirect error:', error.message);
    return false;
  }

  return !!data.session;
}

// ── Dummy member merge ────────────────────────────────────────────────────────

/**
 * Returns all pending merge proposals for groups the current user owns.
 * Each item includes the dummy member name and the new registrant's username.
 *
 * @returns {Promise<Array>}
 */
async function getPendingMerges() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await _sb
    .from('dummy_merge_queue')
    .select(`
      id,
      status,
      dummy_member_id,
      group_id,
      group_members!dummy_member_id (display_name),
      profiles!new_profile_id (username, email),
      groups!group_id (name)
    `)
    .eq('status', 'pending');

  if (error) { console.error('getPendingMerges:', error); return []; }
  return data || [];
}

/**
 * Accepts a merge: replaces the dummy group_member row with the real profile.
 * Sets is_dummy = false, links profile_id, and marks the queue entry accepted.
 *
 * @param {string} mergeId - UUID from dummy_merge_queue.id
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function acceptMerge(mergeId) {
  // Fetch the merge proposal first
  const { data: merge, error: fetchErr } = await _sb
    .from('dummy_merge_queue')
    .select('dummy_member_id, new_profile_id')
    .eq('id', mergeId)
    .single();

  if (fetchErr || !merge) return { ok: false, message: 'Merge proposal not found.' };

  // Update the group_member row: link to real profile, un-dummy it
  const { error: memberErr } = await _sb
    .from('group_members')
    .update({ profile_id: merge.new_profile_id, is_dummy: false })
    .eq('id', merge.dummy_member_id);

  if (memberErr) return { ok: false, message: 'Failed to update member: ' + memberErr.message };

  // Mark the queue entry accepted
  await _sb
    .from('dummy_merge_queue')
    .update({ status: 'accepted' })
    .eq('id', mergeId);

  return { ok: true, message: 'Member merged successfully.' };
}

/**
 * Dismisses a merge proposal without making any changes.
 * The dummy member stays as-is; the registered user stays separate.
 *
 * @param {string} mergeId
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function dismissMerge(mergeId) {
  const { error } = await _sb
    .from('dummy_merge_queue')
    .update({ status: 'dismissed' })
    .eq('id', mergeId);

  if (error) return { ok: false, message: 'Failed to dismiss: ' + error.message };
  return { ok: true, message: 'Merge dismissed.' };
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Validates a basic email format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generates a random password for sign-up.
 * The user never sees or needs this — they always log in via magic link.
 * @returns {string}
 */
function generatePassword() {
  return crypto.randomUUID().replace(/-/g, '') + 'Aa1!';
}

/**
 * Converts Supabase auth error messages into friendlier user-facing strings.
 * @param {Object} error - Supabase AuthError
 * @returns {string}
 */
function friendlyAuthError(error) {
  const msg = error.message || '';
  if (msg.includes('already registered'))  return 'That email is already registered. Try logging in instead.';
  if (msg.includes('invalid email'))       return 'Please enter a valid email address.';
  if (msg.includes('rate limit'))          return 'Too many attempts. Please wait a moment and try again.';
  return msg || 'Something went wrong. Please try again.';
}
