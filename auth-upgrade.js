/* 🔐 AUTH UPGRADE — anonymous → permanent account
   Fixes:
   1. Lazy Firebase init (no "No Firebase App" error)
   2. disallowed_useragent detection for Google
   3. Already-linked accounts → offer sign-in instead + restore progress
*/
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithPopup,
  linkWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// ============================================================
// LAZY AUTH — grab auth once Firebase app is ready, with retry
// ============================================================
let _auth = null;
function getAuthLazy() {
  if (!_auth) {
    try { _auth = getAuth(getApp()); } catch {}
  }
  return _auth;
}

// Background retry: keep polling until Firebase initializes.
// By the time the user clicks any button, _auth will be set.
(function _retryAuthInit() {
  if (_auth) return;
  try { _auth = getAuth(getApp()); }
  catch { setTimeout(_retryAuthInit, 150); }
})();

// ============================================================
// USERAGENT — detect problematic in-app browsers
// ============================================================
function isProblematicUA() {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line\/|TikTok|wechat|MicroMessenger|Twitter\/|Snapchat/i.test(ua);
}

// ============================================================
// BUILD UPGRADE UI
// ============================================================
function buildUpgradeUI() {
  if (document.getElementById('authUpgradeContainer')) return;

  const wrap = document.createElement('div');
  wrap.id = 'authUpgradeContainer';
  document.body.appendChild(wrap);

  // Floating upgrade button (shown when anonymous)
  const btn = document.createElement('button');
  btn.id = 'upgradeAuthBtn';
  btn.className = 'upgrade-auth-btn';
  btn.title = 'Link your account — keep your progress!';
  btn.innerHTML = '🔗 Link Account';
  btn.style.display = 'none';
  btn.onclick = openUpgradeModal;
  document.body.appendChild(btn);

  // Modal
  const overlay = document.createElement('div');
  overlay.id = 'authUpgradeOverlay';
  overlay.className = 'nat-overlay hidden';
  overlay.onclick = e => { if (e.target === overlay) closeUpgradeModal(); };
  overlay.innerHTML = `
    <div class="nat-modal nat-modal-sm">
      <button class="nat-x" onclick="closeUpgradeModal()">×</button>
      <h3>🔗 Link Account</h3>
      <p style="opacity:.7;font-size:13px;margin:0 0 16px">
        Your progress, messages &amp; badges are tied to your UID.<br>
        Link now so you never lose them! 💗<br>
        <span style="color:#f9c74f;font-weight:700">If email is already used, we'll sign you in and restore your progress.</span>
      </p>

      <div id="authUpgradeStatus" style="margin-bottom:12px;font-size:13px;color:#ff7eb6;min-height:16px"></div>

      <!-- Google -->
      <button class="nat-btn-pri" style="width:100%;margin-bottom:10px" id="googleLinkBtn">
        🔵 Link with Google
      </button>

      <!-- Email / Password -->
      <div style="margin-top:8px">
        <input id="authUpgradeEmail" type="email" placeholder="email address…"
               style="width:100%;margin-bottom:8px;padding:8px 12px;border-radius:10px;border:1.5px solid #f7b8c8;font-size:14px;box-sizing:border-box">
        <input id="authUpgradePassword" type="password" placeholder="choose a password…"
               style="width:100%;margin-bottom:8px;padding:8px 12px;border-radius:10px;border:1.5px solid #f7b8c8;font-size:14px;box-sizing:border-box">
        <button class="nat-btn-sec" style="width:100%" id="emailLinkBtn">
          📧 Link with Email
        </button>
      </div>

      <div style="margin-top:16px;font-size:11px;opacity:.5;text-align:center">
        Your UID stays the same — no data loss 🛡️
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Wire up buttons
  document.getElementById('googleLinkBtn').onclick = linkWithGoogle;
  document.getElementById('emailLinkBtn').onclick  = linkWithEmail;

  // Track auth state — show button only when anonymous
  const auth = getAuthLazy();
  if (auth) {
    onAuthStateChanged(auth, user => {
      const upgradeBtn = document.getElementById('upgradeAuthBtn');
      if (upgradeBtn) upgradeBtn.style.display = (user && user.isAnonymous) ? 'flex' : 'none';
    });
  } else {
    setTimeout(() => {
      const a = getAuthLazy();
      if (a) onAuthStateChanged(a, user => {
        const upgradeBtn = document.getElementById('upgradeAuthBtn');
        if (upgradeBtn) upgradeBtn.style.display = (user && user.isAnonymous) ? 'flex' : 'none';
      });
    }, 2000);
  }
}

// ============================================================
// MODAL CONTROLS (global so onclick="" works)
// ============================================================
window.openUpgradeModal  = function() { document.getElementById('authUpgradeOverlay')?.classList.remove('hidden'); };
window.closeUpgradeModal = function() { document.getElementById('authUpgradeOverlay')?.classList.add('hidden'); };

function setStatus(msg, color) {
  const el = document.getElementById('authUpgradeStatus');
  if (el) { el.textContent = msg; el.style.color = color || '#ff7eb6'; }
}

function onLinkedSuccess() {
  setTimeout(() => {
    closeUpgradeModal();
    const btn = document.getElementById('upgradeAuthBtn');
    if (btn) btn.style.display = 'none';
    window.location.reload();
  }, 2000);
}

// ============================================================
// MERGE progress from old anon UID → new signed-in UID
// Copies badges/pfp/lvl from old profile to new one if new is empty
// ============================================================
async function mergeProgressIfNeeded(oldUID, newUID) {
  if (!oldUID || !newUID || oldUID === newUID) return;
  const db = window._natDB;
  if (!db) return;

  try {
    const oldSnap = await db.get(db.ref(db.db, 'userProfiles/' + oldUID));
    const newSnap = await db.get(db.ref(db.db, 'userProfiles/' + newUID));
    const oldData = oldSnap.val();
    const newData = newSnap.val();

    // Only merge if new profile is missing key data
    if (oldData && (!newData || !newData.level)) {
      const merged = { ...(newData || {}), ...oldData };
      await db.set(db.ref(db.db, 'userProfiles/' + newUID), merged);
      console.log('[auth-upgrade] profile merged from', oldUID, '→', newUID);
    }
  } catch (e) {
    console.warn('[auth-upgrade] merge failed:', e.message);
  }
}

// ============================================================
// LINK WITH GOOGLE
// ============================================================
function showUnauthorizedDomainHelp() {
  setStatus(
    '⚠️ This domain isn\'t in your Firebase allowlist. ' +
    'Go to Firebase Console → Authentication → Settings → Authorized Domains and add this site\'s domain. ' +
    'Then try again 💡',
    '#e67e22'
  );
}

async function linkWithGoogle() {
  if (isProblematicUA()) {
    setStatus('⚠️ Google sign-in doesn\'t work in this browser. Open in Chrome or Safari 💡', '#e67e22');
    return;
  }

  const auth = getAuthLazy();
  if (!auth) return setStatus('Firebase not ready yet — try again in a sec 😤', '#e74c3c');

  const user = auth.currentUser;
  if (!user) return setStatus('not logged in yet 😤', '#e74c3c');

  const oldUID = user.uid;
  const provider = new GoogleAuthProvider();

  try {
    setStatus('opening Google sign-in… 👀', '#888');
    await linkWithPopup(user, provider);
    setStatus('✅ linked with Google! your account is now permanent 🎉', '#27ae60');
    onLinkedSuccess();
  } catch (err) {
    if (err.code === 'auth/unauthorized-domain') {
      showUnauthorizedDomainHelp();
    } else if (err.code === 'auth/credential-already-in-use') {
      // Same Google account linked on another device — just sign in so both devices share the same account
      setStatus('⚠️ that Google account is already linked — signing you into the same account (works across all your devices!) 💗', '#e67e22');
      try {
        const result = await signInWithPopup(auth, provider);
        const newUID = result.user.uid;
        await mergeProgressIfNeeded(oldUID, newUID);
        setStatus('✅ signed in! you\'re now on the same account on every device 🎉', '#27ae60');
        onLinkedSuccess();
      } catch (e2) {
        if (e2.code === 'auth/unauthorized-domain') { showUnauthorizedDomainHelp(); return; }
        setStatus('error signing in: ' + (e2.message || e2.code), '#e74c3c');
      }
    } else if (err.code === 'auth/email-already-in-use') {
      // Google email already associated with an email/password account — sign in to restore progress
      setStatus('⚠️ that Google email already has an account — signing you in to restore progress…', '#e67e22');
      try {
        const result = await signInWithPopup(auth, provider);
        const newUID = result.user.uid;
        await mergeProgressIfNeeded(oldUID, newUID);
        setStatus('✅ signed in with Google! your badges & progress are restored 💗', '#27ae60');
        onLinkedSuccess();
      } catch (e2) {
        if (e2.code === 'auth/unauthorized-domain') { showUnauthorizedDomainHelp(); return; }
        setStatus('error: ' + (e2.message || e2.code), '#e74c3c');
      }
    } else if (err.code === 'auth/disallowed-useragent' || err.code === 'auth/operation-not-allowed') {
      setStatus('⚠️ please open this page in Chrome or Safari to use Google sign-in 💡', '#e67e22');
    } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      setStatus('cancelled — try again 👀', '#888');
    } else {
      setStatus('error: ' + (err.message || err.code), '#e74c3c');
    }
  }
}

// ============================================================
// LINK WITH EMAIL + PASSWORD
// ============================================================
async function linkWithEmail() {
  const email    = document.getElementById('authUpgradeEmail')?.value?.trim();
  const password = document.getElementById('authUpgradePassword')?.value;

  if (!email || !password) return setStatus('fill in email and password 😤');
  if (password.length < 6)  return setStatus('password must be at least 6 characters 😤');

  const auth = getAuthLazy();
  if (!auth) return setStatus('Firebase not ready yet — try again in a sec 😤', '#e74c3c');

  const user = auth.currentUser;
  if (!user) return setStatus('not logged in yet 😤', '#e74c3c');

  const oldUID = user.uid;

  try {
    setStatus('linking…', '#888');
    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(user, credential);
    setStatus('✅ linked with email! your account is now permanent 🎉', '#27ae60');
    onLinkedSuccess();
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      // Email already exists — sign in with it to restore that account's progress
      setStatus('⚠️ that email is already used — signing you in & restoring progress…', '#e67e22');
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const newUID = result.user.uid;
        await mergeProgressIfNeeded(oldUID, newUID);
        setStatus('✅ signed in! your badges, pfp & progress are restored 💗', '#27ae60');
        onLinkedSuccess();
      } catch (signInErr) {
        if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
          setStatus('⚠️ that email exists but the password is wrong — check your password 🔑', '#e74c3c');
        } else {
          setStatus('sign-in error: ' + (signInErr.message || signInErr.code), '#e74c3c');
        }
      }
    } else if (err.code === 'auth/provider-already-linked') {
      setStatus('⚠️ email/password is already linked to your account 👀', '#e67e22');
    } else if (err.code === 'auth/weak-password') {
      setStatus('⚠️ password too weak — use at least 6 characters', '#e74c3c');
    } else {
      setStatus('error: ' + (err.message || err.code), '#e74c3c');
    }
  }
}

// ============================================================
// INIT
// ============================================================
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUpgradeUI);
else buildUpgradeUI();
