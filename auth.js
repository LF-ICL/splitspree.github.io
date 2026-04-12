/**
 * supabase.js
 * Initialises the Supabase client. Every other JS file imports `_sb`.
 *
 * ── SETUP ───────────────────────────────────────────────────────────────────
 * Replace the two placeholder strings below with your real values from:
 *   Supabase Dashboard → Project Settings → API
 *     • Project URL   → SUPABASE_URL
 *     • anon/public   → SUPABASE_ANON_KEY
 * ────────────────────────────────────────────────────────────────────────────
 */

const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// The Supabase JS SDK is loaded via CDN in index.html before this file.
// `supabase` (lowercase) is the global exposed by the CDN bundle.
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Store the session in a cookie so it survives page reloads and works
    // across devices when the same email is used to log in.
    persistSession: true,
    storageKey: 'splitspree_session',
    storage: {
      // Use cookies instead of localStorage for cross-device support.
      getItem:    key => getCookie(key),
      setItem:    (key, value) => setCookie(key, value, 30),  // 30-day expiry
      removeItem: key => deleteCookie(key),
    },
  },
});

// ── Cookie helpers ────────────────────────────────────────────────────────────

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}
