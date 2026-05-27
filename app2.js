// =========================
// ✅ IMPORTS FIRST (NOTHING ABOVE THIS)
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, runTransaction, push, set, remove, query, orderByChild, limitToLast, get }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// your modules
import {
  computeBadges,
  getBadgeById,
  BADGE_ORDER,
  BADGE_ORDER_MAP,
  BADGES,
  getAllBadges,
  ASCENDED_THRESHOLDS,
  ALL_HOBBY_BADGE_IDS,
  ALL_BOOK_BADGE_IDS,
  ALL_TEACH_BADGE_IDS
} from './badges.js';
import { getComboBadge, getNextComboTier, renderComboBadgeHTML } from './combos.js';
import { initHobbyReactions } from './hobby-reactions.js';
import { initHobbyUpload } from './hobby-upload.js';
import { ROLES, hasPerk, tryUnlockRole, getCurrentRole, clearRole, renderRoleChipHTML } from './roles.js';
import { openGame, closeGame } from './game.js';
import { openChat, closeChat, sendChatMessage, clearChatHistory } from './chat-nat.js';
import * as Badges from './badges.js';

window._natBadges = Badges;
// =========================
// ✅ LOGS
// =========================
console.log('APP STARTED');

window._natFirebase = {};
window._natPfp = {};
// =========================
// VARIABLES
// =========================
let isReacting = false;
let chibiBusy = false;

const _msgListeners = new Set();

// ── PFP CACHE ──────────────────────────────────────────────────────────────
// Stores { pfp: dataURL|null, showPfp: bool } keyed by uid.
// null = loaded but user has showPfp:false or no pfp set.
// undefined = not yet fetched.
const _pfpCache = {};
const _pfpPending = new Set();

async function _fetchPfp(uid) {
  if (!uid || _pfpPending.has(uid)) return;
  _pfpPending.add(uid);
  try {
    const db = window._natDB;
    if (!db) return;
    const snap = await db.get(db.ref(db.db, 'userProfiles/' + uid));
    const p = snap.val() || {};
    _pfpCache[uid] = (p.showPfp && p.pfp) ? p.pfp : null;
    // After loading, inject into any visible elements waiting for this uid
    document.querySelectorAll(`[data-pfp-uid="${CSS.escape(uid)}"]`).forEach(el => {
      _applyPfpEl(el, _pfpCache[uid]);
    });
  } catch { _pfpCache[uid] = null; }
  finally { _pfpPending.delete(uid); }
}

function _applyPfpEl(el, pfpSrc) {
  if (pfpSrc) {
    el.innerHTML = `<img src="${pfpSrc}" alt="pfp" class="msg-pfp-img">`;
  } else {
    el.innerHTML = '';
    el.style.display = 'none';
  }
}

/** Call after injecting message/leaderboard HTML to async-fill pfp placeholders */
function _loadPfpsInContainer(container) {
  container.querySelectorAll('[data-pfp-uid]').forEach(el => {
    const uid = el.dataset.pfpUid;
    if (_pfpCache[uid] !== undefined) {
      _applyPfpEl(el, _pfpCache[uid]);
    } else {
      _fetchPfp(uid);
    }
  });
}
// Expose globally so other modules (worldmap.js etc.) can use the cache
window._natPfp = { load: _loadPfpsInContainer, cache: _pfpCache, fetch: _fetchPfp, apply: _applyPfpEl };
// ──────────────────────────────────────────────────────────────────────────

// ── PER-UID PROFILE FETCH (badge fallback) ─────────────────────────────────
// When the bulk profileCache listener hasn't fired yet (800ms delay),
// renderMessage() would fall through to the stale m.badgeIds snapshot.
// This fetches the real profile for a single UID on demand — same pattern
// as _fetchPfp — then surgically repaints ONLY the badge rows for that UID
// so the full message list is never re-rendered just to fix one user's badges.
const _profileFetchPending = new Set();

async function _fetchProfileForBadges(uid) {
  if (!uid || _profileFetchPending.has(uid)) return;
  // Already in cache (bulk listener has fired) — nothing to do.
  if (window.profileCache && window.profileCache[uid]) return;
  _profileFetchPending.add(uid);
  try {
    const db = window._natDB;
    if (!db) return;
    const snap = await db.get(db.ref(db.db, 'userProfiles/' + uid));
    const p = snap.val() || {};
    // Merge into profileCache so subsequent renders use it instantly.
    window.profileCache = window.profileCache || {};
    window.profileCache[uid] = {
      ...window.profileCache[uid],
      ...p,
      earnedBadges: p.earnedBadges || [],
    };
    // Surgically repaint badge rows only for this UID — no full renderMessages().
    _repaintBadgeRowsForUid(uid);
  } catch { /* silent — next render will try again */ }
  finally { _profileFetchPending.delete(uid); }
}

function _repaintBadgeRowsForUid(uid) {
  const prof = window.profileCache && window.profileCache[uid];
  if (!prof) return;

  const rawIds = prof.earnedBadges || [];

  const sorted = rawIds.slice().sort((a, b) =>
    (BADGE_ORDER_MAP.get(a) ?? 999) -
    (BADGE_ORDER_MAP.get(b) ?? 999)
  );

  // full badge HTML
  const allBadgeHTML = sorted.map(id => {
    const b = getBadgeById(id);
    if (!b) return '';
    return `
      <span class="badge-chip ${b.anim}"
            data-badge-id="${id}"
            title="${b.label}">
        ${b.icon}
      </span>
    `;
  }).join('');

  // top 3 only
  const inlineHTML = sorted.slice(0, 3).map(id => {
    const b = getBadgeById(id);
    if (!b) return '';
    return `
      <span class="badge-chip ${b.anim}"
            data-badge-id="${id}"
            title="${b.label}">
        ${b.icon}
      </span>
    `;
  }).join('');

  const hasMore = sorted.length > 3;

  document.querySelectorAll(
    `[data-pfp-uid="${CSS.escape(uid)}"]`
  ).forEach(pfpEl => {

    const bubble = pfpEl.closest('.message-bubble');
    if (!bubble) return;

    // remove old rows
    const oldRow = bubble.querySelector('.msg-badges-row');
    if (oldRow) oldRow.remove();

    // update inline badges
    let inlineSpan = bubble.querySelector('.user-badges-inline');

    if (!inlineSpan) {
      const sender = bubble.querySelector('.msg-sender');
      if (!sender) return;

      inlineSpan = document.createElement('span');
      inlineSpan.className = 'user-badges-inline';
      sender.appendChild(inlineSpan);
    }

    inlineSpan.innerHTML = inlineHTML;

    // update +x button
    let moreBtn = bubble.querySelector('.badge-more-indicator');

    if (hasMore) {

      if (!moreBtn) {
        moreBtn = document.createElement('span');
        moreBtn.className = 'badge-more-indicator';

        const sender = bubble.querySelector('.msg-sender');
        if (sender) sender.appendChild(moreBtn);
      }

      moreBtn.dataset.allBadges =
        encodeURIComponent(allBadgeHTML);

      moreBtn.textContent =
        '+' + (sorted.length - 3);

    } else if (moreBtn) {
      moreBtn.remove();
    }

  });
}

setTimeout(() => {
  renderMessages();
}, 1000);
// ──────────────────────────────────────────────────────────────────────────
let lastSentTime = 0;
const SEND_COOLDOWN = 10000;
let allMessages = [];
let galleryReady = false;


// =========================
// FIREBASE INIT
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyAow-1B5hJqAaFYEVXg8KVJhUHNGs5q3Iw",
  authDomain: "fun-facts-about-me.firebaseapp.com",
  databaseURL: "https://fun-facts-about-me-default-rtdb.firebaseio.com",
  projectId: "fun-facts-about-me",
  storageBucket: "fun-facts-about-me.firebasestorage.app",
  messagingSenderId: "244373782443",
  appId: "1:244373782443:web:bbd26db6f50ba29e4fdcee"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
window._natFirebase = { app, db, auth, ref, onValue, runTransaction, push, set, remove, query, orderByChild, limitToLast, get };

// =========================
// BADGES
// =========================
let currentUID = null;
const ADMIN_UID    = "zNDEej9J3kg79fUYxJjxLqrXJpz2";
const OLD_ADMIN_UID = "FfSIOOqNV6NTqb4eKV8RbAARDm33";
const OLD_ADMIN_UID2 = "8IumnftXW1gJCa4iNbicZ0M0LOg2";
const ADMIN_EMAILS  = ['nieytan.smth@gmail.com'];

function isAdmin(uid) {
  if (uid === ADMIN_UID || uid === OLD_ADMIN_UID || uid === OLD_ADMIN_UID2) return true;
  const u = auth.currentUser;
  return !!(u?.email && ADMIN_EMAILS.some(e => u.email.toLowerCase() === e.toLowerCase()));
}

// Checks admin using BOTH currentUID and live auth.currentUser — survives double auth-state fires
function isAdminNow() {
  if (isAdmin(currentUID)) return true;
  const fbUser = auth.currentUser;
  if (!fbUser) return false;
  if (fbUser.uid === ADMIN_UID || fbUser.uid === OLD_ADMIN_UID || fbUser.uid === OLD_ADMIN_UID2) return true;
  return !!(fbUser.email && ADMIN_EMAILS.some(e => fbUser.email.toLowerCase() === e.toLowerCase()));
}

window.initHobbyReactions = initHobbyReactions;
window.initHobbyUpload = initHobbyUpload;

// ── LOCAL BADGE SYSTEM (hobby/service/special badges stored in localStorage) ──
const LOCAL_BADGE_KEY = 'natnat_local_badges';
function getLocalBadges() {
  try { return JSON.parse(localStorage.getItem(LOCAL_BADGE_KEY) || '[]'); } catch { return []; }
}
// Load saved local badges into __extraBadges immediately
(function _initLocalBadges() {
  const badges = getLocalBadges();
  if (!window.__extraBadges) window.__extraBadges = [];
  badges.forEach(id => { if (!window.__extraBadges.includes(id)) window.__extraBadges.push(id); });
})();
function _checkBadgeCompletions() {
  const cur = getLocalBadges();
  const has = id => cur.includes(id);
  if (ALL_HOBBY_BADGE_IDS.every(id => has(id)) && !has('hobby_disciple')) window.awardLocalBadge('hobby_disciple');
  if (ALL_BOOK_BADGE_IDS.every(id => has(id)) && !has('svc_kamote_rider')) window.awardLocalBadge('svc_kamote_rider');
  if (ALL_TEACH_BADGE_IDS.every(id => has(id)) && !has('svc_boss')) window.awardLocalBadge('svc_boss');
}
window.awardLocalBadge = function(id) {
  const cur = getLocalBadges();
  if (cur.includes(id)) return false;
  cur.push(id);
  localStorage.setItem(LOCAL_BADGE_KEY, JSON.stringify(cur));
  if (!window.__extraBadges) window.__extraBadges = [];
  if (!window.__extraBadges.includes(id)) window.__extraBadges.push(id);
  try {
    const b = getBadgeById(id);
    showToast('🏅 Badge unlocked: ' + (b ? b.icon + ' ' + b.label : id));
  } catch { showToast('🏅 Badge unlocked!'); }
  _checkBadgeCompletions();
  // 🔄 Sync all earned badges to Firebase so other users' messages update live
  _syncBadgesToFirebase();
  return true;
};
window._syncBadgesToFirebase = function _syncBadgesToFirebase() {
  if (!window.currentUID) return;
  try {
    let all = [];
    if (window.__badgesAPI?.getEarned) {
      try { all = [...window.__badgesAPI.getEarned()]; } catch {}
    }
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_BADGE_KEY) || '[]');
      local.forEach(id => { if (!all.includes(id)) all.push(id); });
    } catch {}
    (window.__extraBadges || []).forEach(id => { if (!all.includes(id)) all.push(id); });

    // ✅ Write into local profileCache immediately so the NEXT renderMessage()
    // call sees up-to-date badges without waiting for the bulk onValue to re-fire.
    // This closes the race between earning a badge and sending the next message.
    window.profileCache = window.profileCache || {};
    if (!window.profileCache[window.currentUID]) {
      window.profileCache[window.currentUID] = {};
    }
    window.profileCache[window.currentUID].earnedBadges = all;

    return set(ref(db, 'userProfiles/' + window.currentUID + '/earnedBadges'), all).catch(() => {});
  } catch {}
};
function _syncBadgesToFirebase() { return window._syncBadgesToFirebase(); }
window.addEventListener("DOMContentLoaded", () => {
  initHobbyReactions();
  initHobbyUpload(isAdmin(currentUID));
});

// All badge IDs as a Set — computed once at module load, never rebuilt.
// Used by getEarnedBadges() for admin users so we don't flatmap BADGES on every call.
const _ALL_BADGE_IDS = new Set(getAllBadges().map(b => b.id));

function getEarnedBadges(...args) {
  if (isAdmin(currentUID)) return _ALL_BADGE_IDS; // O(1), no rebuild
  return computeBadges(...args);
}


// =========================
// RATE ME CONFIG
// =========================
const RATE_KEYS = ['obsessed', 'dikokaya', 'slay', 'cute', 'lol'];

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n;
}


// =========================
// 🔥 REALTIME RATE LISTENER
// =========================
onValue(ref(db, 'rateme'), snap => {
  const data = snap.val() || {};

  RATE_KEYS.forEach((key, i) => {
    const el = document.getElementById('cnt-' + i);
    if (!el) return;

    el.textContent = formatCount(data[key] || 0);
  });
});


// =========================
// AUTH (ONLY ONE LISTENER)
// =========================
// NOTE: Do NOT call signInAnonymously() unconditionally — it would create a new
// anonymous session even when the user already has a Google/email account linked,
// wiping their persistent login on every page refresh.
// Instead, we check inside onAuthStateChanged: if no user exists at all, THEN
// sign in anonymously so first-time visitors get an anonymous session.

onAuthStateChanged(auth, user => {
  if (user) {
    currentUID = user.uid;
    window.currentUID = user.uid;
    renderMessages();
    // Push current earned badges to Firebase so messages show live badges
    setTimeout(window._syncBadgesToFirebase, 1000);
  } else {
    // No session at all (genuine fresh first visit or sign-out) — create anon session
    signInAnonymously(auth).catch(e => console.warn('[auth] anon sign-in failed:', e.code));
  }
});
// =========================
// 🌐 GLOBAL FUNCTIONS
// =========================
// =========================
// ⭐❤️ UI HELPERS
// =========================

// prevent spam (1 click per service per user)
function canReact(type, id) {
  const key = `${type}_${id}`;
  if (localStorage.getItem(key)) return false;

  localStorage.setItem(key, "1");
  return true;
}

// small click animation
function flash(el) {
  el.classList.add("clicked");
  setTimeout(() => el.classList.remove("clicked"), 150);
}
// ── Service → badge ID mapping ──
const _SVC_BADGE_MAP = {
  'bike':    'svc_book_bike',
  'e-bike':  'svc_book_ebike',
  'ebike':   'svc_book_ebike',
  'motor':   'svc_teach_motor',
  'car':     'svc_teach_car',
  'friend':  'svc_friend_plate',
  'bff':     'svc_bff_plate',
  'gf':      'svc_gf_plate',
  'bf':      'svc_gf_plate',
};

// Messenger booking
window.book = function(service, badgeId) {
  if (!currentUID) {
    alert("wait lang… loading user 👀");
    return;
  }

  // Award badge if badgeId is passed explicitly, else try auto-detect from service string
  const _bid = badgeId || (() => {
    const lower = (service || '').toLowerCase();
    for (const [key, bid] of Object.entries(_SVC_BADGE_MAP)) {
      if (lower.includes(key)) return bid;
    }
    return null;
  })();
  if (_bid && window.awardLocalBadge) window.awardLocalBadge(_bid);

  const msg = encodeURIComponent(
    `Hi! I want ${service} 👀\nUID: ${currentUID}`
  );

  window.open(`https://m.me/nathan2wild?text=${msg}`, "_blank");
};


// GF/BF → GitHub Issue
window.openGF = function() {
  if (!currentUID) {
    alert("wait lang… loading user 👀");
    return;
  }

  const title = encodeURIComponent("GF/BF Application 😳");
  const body = encodeURIComponent(
    `Hi nat 😳\n\nI want to apply...\n\nUID: ${currentUID}`
  );

  window.open(
    `https://github.com/natpyydev/funfactsaboutme/issues/new?title=${title}&body=${body}`,
    "_blank"
  );
};
// =========================
// 🔥 SCROLL REVEAL (ADD)
// =====================
function initScrollReveal() {
const cards = document.querySelectorAll('.fact-card');

const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) entry.target.classList.add('show');
});
}, { threshold: 0.2 });

cards.forEach((card, i) => {
card.classList.add(i % 2 === 0 ? 'from-left' : 'from-right');
observer.observe(card);
});
}

// ============================================================
// Feature #7 — PERSISTENT USER STATE via localStorage
// ============================================================
const SESSION_KEY = 'natnat_user_state';
function loadState() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || {}; } catch { return {}; }
}

// OPTIMIZATION: Debounced saveState to prevent lag from constant localStorage writing
let saveTimeout;
function saveState(patch) {
  const s = { ...loadState(), ...patch };
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }, 500);
}
const saved = loadState();

// ============================================================
// AUDIO ENGINE
// ============================================================
let audioCtx = null;
function getAudioCtx() {
  // OPTIMIZATION: Added latencyHint for better performance
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  return audioCtx;
}
function playTone({ type='sine', freq=440, freq2=null, duration=0.18, volume=0.18, decay=0.15 }={}) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freq2) osc.frequency.linearRampToValueAtTime(freq2, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + decay);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration + decay + 0.05);
}
function playChord(freqs, opts={}) { freqs.forEach((f,i)=>setTimeout(()=>playTone({freq:f,...opts}),i*40)); }

// =========================
// 🔊 AUDIO / SFX SYSTEM (CLEAN)
// =========================

// ⏱ typing cooldown (prevents audio spam glitch)
// ⏱ typing cooldown (prevents audio glitch spam)
let lastTypeTime = 0;

// 🔊 play audio helper (with bg ducking + sfx volume from settings)
function playAudio(filename, volume = 0.6) {
  const bg = document.getElementById('bgMusic');

  const sfxVol = (typeof window.natSfxVolume === 'number') ? window.natSfxVolume : volume;
  const a = new Audio(filename);
  a.volume = sfxVol;

  // 🔉 gently lower bg music while sfx plays
  if (bg && !bg.paused) {
    const originalVol = bg.volume;
    bg.volume = 0.1;

    const restore = () => {
      bg.volume = originalVol;
    };

    a.addEventListener('ended', restore, { once: true });
    a.addEventListener('error', restore, { once: true });
  }

  a.play().catch(() => {});
  return a; // ✅ FIXED (return correct audio)
}


// 🎀 ALL SFX
window.SFX = {

  // ❤️ image reactions
  imgReact: e => {
    const m = {
      '😍': 'audio/romance sfx.mp3',
      '😭': 'audio/xue sfx.mp3',
      '💅': 'audio/rizz sfx.mp3',
      '🥺': 'audio/aww sfx.mp3',
      '😆': 'audio/bocchi sfx.mp3'
    };
    if (m[e]) playAudio(m[e]);
  },

  // 🔥 special emoji reactions
  specialReact: e => {
    const m = {
      '\u{1F929}': 'audio/Wow anime sound meme.mp3',
      '\u{1F451}': 'audio/Instagram thud.mp3',
      '\u{1F480}': 'audio/Fah sfx.mp3',
      '\u{1F928}': 'audio/dexter meme.mp3',
      '\u{1F624}': 'audio/Fah sfx.mp3'
    };
    const k = e.normalize('NFC');
    if (m[k]) playAudio(m[k]);
  },

  // ✍️ typing (STABLE + FAST, respects SFX volume slider)
  type: () => {
    const sfxVol = (typeof window.natSfxVolume === 'number') ? window.natSfxVolume : 0.6;
    if (sfxVol < 0.01) return;
    const a = new Audio('audio/type.mp3');
    a.currentTime = 0.05;
    a.volume = sfxVol * 0.5;
    a.playbackRate = 1.2 + Math.random() * 0.3;
    a.play().catch(()=>{});
  },

  // 💬 bubble pop (respects SFX volume slider)
  message: () => {
    const sfxVol = (typeof window.natSfxVolume === 'number') ? window.natSfxVolume : 0.6;
    if (sfxVol < 0.01) return;
    const a = new Audio('audio/pop.mp3');
    a.volume = sfxVol * 0.8;
    a.currentTime = 0;
    a.play().catch(()=>{});
  },

  // 📊 rate buttons
  rateMe: idx => {
    const s = [
      () => playChord([659, 784, 1047], { type: 'sine', duration: 0.15, volume: 0.2 }),
      () => playTone({ type: 'sawtooth', freq: 220, freq2: 110, duration: 0.3, volume: 0.15 }),
      () => {
        playTone({ freq: 880, duration: 0.08, volume: 0.15 });
        setTimeout(() => playTone({ freq: 1047, duration: 0.08, volume: 0.15 }), 90);
      },
      () => playChord([523, 659], { type: 'sine', duration: 0.2, volume: 0.12 }),
      () => [400, 450, 500, 450, 400].forEach((f, i) =>
        setTimeout(() => playTone({ freq: f, duration: 0.07, volume: 0.13 }), i * 60)
      ),
    ];
    s[idx]?.();
  },

  // 📩 message sent
  messageSent: () => {
    playChord([523, 659, 784], { type: 'sine', duration: 0.15, volume: 0.15 });
    setTimeout(() => playTone({ freq: 1047, duration: 0.2, volume: 0.12 }), 180);
  },

  // ❌ error
  error: () => playAudio('audio/error sfx.mp3'),

  // 💬 react
  msgReact: () => playTone({ type: 'sine', freq: 660, duration: 0.1, volume: 0.12 }),

  // 👍 upvote
  upvote: () => playChord([523, 659], { type: 'sine', duration: 0.12, volume: 0.12 }),

  // 📌 pin
  pin: () => playAudio('audio/Instagram thud.mp3'),
};


// 🎵 BG MUSIC (FIXED — NOT TOO LOUD)
const bgMusic = document.getElementById('bgMusic');

document.addEventListener('click', () => {
  getAudioCtx();

  if (bgMusic) {
    bgMusic.muted = false;
    bgMusic.volume = 0.2; // ✅ FIXED (was 1 = too loud)
    bgMusic.play().catch(()=>{});
  }

}, { once: true });

// 🖱 Global click SFX — subtle tone on every click, respects volume slider
let _lastGlobalClickSfx = 0;
document.addEventListener('click', () => {
  const now = Date.now();
  if (now - _lastGlobalClickSfx < 80) return;
  _lastGlobalClickSfx = now;
  const vol = typeof window.natSfxVolume === 'number' ? window.natSfxVolume : 0.6;
  if (vol < 0.01) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(vol * 0.055, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.11);
  } catch {}
}, true);
// ============================================================
// HELPERS
// ============================================================
function deleteMessage(key, ownerUID) {
  if (!isAdmin(currentUID) && currentUID !== ownerUID) return;

  pendingDeleteKey = key;
  pendingOwnerUID = ownerUID;

  document.getElementById('deleteConfirm').classList.remove('hidden');
}
window.addEventListener('DOMContentLoaded', () => {
  const confirmYesBtn = document.getElementById('confirmYes');
  
  if (!confirmYesBtn) return;
  
confirmYesBtn.onclick = () => {
  if (!pendingDeleteKey) return;

  const msg = allMessages.find(m => m._key === pendingDeleteKey);
  if (!msg) return;

  lastDeletedMsg = msg;

  // ✅ STEP A: instant UI removal
  allMessages = allMessages.filter(m => m._key !== pendingDeleteKey);
  renderMessages();

  // ✅ STEP B: close modal
  closeConfirm();

  // ✅ STEP C: delete from Firebase
  remove(ref(db, 'messages/' + pendingDeleteKey))
    .then(() => {
      showUndoToast();
    })
    .catch((err) => {
      console.error('DELETE ERROR:', err);
      showToast('failed to delete 😤');

      // 🔁 RESTORE ONLY IF DELETE FAILED
      allMessages.push(lastDeletedMsg);
      renderMessages();
    });
};
});
function closeConfirm() {
  pendingDeleteKey = null;
  pendingOwnerUID = null;
  document.getElementById('deleteConfirm').classList.add('hidden');
}

function escapeHtml(str) {
  if(!str) return '';
  return str.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}
function showUndoToast() {
  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.innerHTML = `
    message deleted
    <button class="undo-btn">UNDO</button>
  `;

  document.body.appendChild(toast);

  const undoBtn = toast.querySelector('.undo-btn');

  const timer = setTimeout(() => {
    toast.remove();
    lastDeletedMsg = null;
  }, 5000);

  undoBtn.onclick = () => {
    clearTimeout(timer);
    undoDelete();
    toast.remove();
  };
}
// ============================================================
// GIF REACTION DATA
// ============================================================
const NORMAL_GIF_MAP = {
  '😍':'https://media.tenor.com/E5c8s3YlffcAAAAM/sailor-moon-love.gif',
  '😭':'https://c.tenor.com/jBz6U06b1AMAAAAd/tenor.gif',
  '💅':'https://animesher.com/orig/0/81/818/8183/animesher.com_girl-gif-funny-818332.gif',
  '🥺':'https://media1.tenor.com/m/4q5OwnFZJdEAAAAd/adorable-pleading.gif',
  '😆':'https://media1.tenor.com/m/Hqi4J6__E9kAAAAd/frenedol.gif',
};
const NORMAL_LABELS = {'😍':'Obsessed','😭':'Di ko kaya','💅':'Slay','🥺':'Ang cute','😆':'Lol'};
const NORMAL_REACTIONS = Object.keys(NORMAL_GIF_MAP);
const SPECIAL_REACTIONS = ['\u{1F929}','\u{1F624}','\u{1F451}','\u{1F480}','\u{1F928}'];
const MSG_REACTIONS = ['\u2764\uFE0F','\u{1F606}','\u{1F62E}','\u{1F525}','\u{1F480}'];

// ============================================================
// USER STATE — restored from localStorage (Feature #7)
// ============================================================
const gifReactionState = Array(10).fill(null).map(()=>({}));
let _savedGifReacts    = saved.userGifReactions   || [];
// Extend to cover all current photos (safe even if saved state is shorter)
let userGifReactions   = Array(10).fill(null).map((_,i) => _savedGifReacts[i] || {});
let userArtistReacts   = saved.userArtistReacts   || {};
let userMsgReacts      = saved.userMsgReacts      || {};
let userUpvotes        = saved.userUpvotes        || {};
let userRateChoice     = saved.userRateChoice     ?? null;
let userMsgCount       = saved.userMsgCount       || 0;
let userRoleBadges     = [];
let _prevEarned        = new Set();

// Load role badges from Firebase Roles node
const sessionId = localStorage.getItem('user_session_id');
if (sessionId) {
  onValue(ref(db,'Roles/'+sessionId), snap => {
    const data = snap.val() || {};
    userRoleBadges = Object.entries(data).filter(([,v])=>v===true).map(([k])=>k);
  });
}

// Restore rate me UI from saved state
if (userRateChoice !== null) {
  // Will be applied after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const allBtns = document.querySelectorAll('.big-reaction-btn');
    if (allBtns[userRateChoice]) allBtns[userRateChoice].classList.add('active');
  });
}

// ============================================================
// MILESTONE TIERS for message reactions
// ============================================================
function getMilestoneTier(count) {
  if (count >= 1000000) return { label:'🌋 VOLCANIC',  cls:'react-tier-volcanic' };
  if (count >= 100000)  return { label:'👑 LEGENDARY', cls:'react-tier-legendary' };
  if (count >= 10000)   return { label:'🔥 VIRAL',     cls:'react-tier-viral' };
  if (count >= 1000)    return { label:'⚡ POPULAR',   cls:'react-tier-popular' };
  if (count >= 100)     return { label:'✨ RISING',    cls:'react-tier-rising' };
  if (count >= 10)      return { label:'💬 ACTIVE',    cls:'react-tier-active' };
  return null;
}
function updateReactBtn(btn, emoji, count) {
  btn.classList.remove('react-tier-active','react-tier-rising','react-tier-popular','react-tier-viral','react-tier-legendary','react-tier-volcanic');
  const tier = getMilestoneTier(count);
  if (tier) btn.classList.add(tier.cls);
  const span = btn.querySelector('.msg-react-count');
  if (count > 0) {
    const display = tier ? `${formatCount(count)} ${tier.label}` : formatCount(count);
    if (span) {
      span.classList.remove('count-pop'); void span.offsetWidth; span.classList.add('count-pop');
      span.textContent = display;
    } else {
      const s = document.createElement('span'); s.className='msg-react-count count-pop'; s.textContent=display; btn.appendChild(s);
    }
  } else { if(span) span.remove(); }
}

// ============================================================
// IMAGE REACTIONS
// ============================================================
function initReactionButtons() {
  for (let idx = 0; idx < PICS.length; idx++) {
    const container = document.getElementById('gif-reactions-'+idx);
    if (!container) continue;

    // Artist pic gets normal + special reactions
    const reactions = idx === SPECIAL_IDX
      ? [...NORMAL_REACTIONS, ...SPECIAL_REACTIONS]
      : NORMAL_REACTIONS;

    reactions.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'reaction-btn gif-reaction-btn';
      btn.dataset.emoji = emoji;
      const count = gifReactionState[idx][emoji]||0;
      const isSpecialEmoji = SPECIAL_REACTIONS.includes(emoji);

      btn.innerHTML = `
  <span class="emoji">${emoji}</span>
  <span class="count">${formatCount(count)}</span>
`;
      if (userGifReactions[idx]?.[emoji]) btn.classList.add('active');
      btn.onclick = e => { e.stopPropagation(); toggleGifReaction(btn,idx,emoji); };
      container.appendChild(btn);
    });
  }
}

// ============================================================
// GALLERY PHOTOS — shared data layer (gallery-data.js)
// DO NOT add images here. Edit gallery-data.js instead.
// Both normal mode and Professional Mode read from NAT_GALLERY.
// ============================================================
const PICS         = window.NAT_GALLERY?.PICS        ?? [];
const TOTAL_SLIDES = window.NAT_GALLERY?.TOTAL       ?? 0;
const SPECIAL_IDX  = window.NAT_GALLERY?.SPECIAL_IDX ?? (PICS.length - 1);

// ============================================================
// PHOTO WALL GALLERY (replaces carousel)
// ============================================================
function initGallery() {
  const grid = document.getElementById('photosWallGrid');
  if (!grid) return;

  // Render hidden reaction containers
  for (let idx = 0; idx < TOTAL_SLIDES; idx++) {
    const hidden = document.createElement('div');
    hidden.id = 'gif-reactions-' + idx;
    hidden.style.display = 'none';
    grid.appendChild(hidden);
  }

  initReactionButtons();

  // Build wall frames
  PICS.forEach((pic, idx) => {
    const tilt = ((idx % 6) - 2.5) * 1.8;
    const frame = document.createElement('div');
    frame.className = 'photos-wall-frame' + (pic.special ? ' photos-wall-special' : '');
    frame.style.transform = `rotate(${tilt.toFixed(1)}deg)`;
    frame.dataset.idx = idx;

    frame.innerHTML = `
      <div class="photos-wall-inner">
        <img src="${pic.src}" alt="${pic.alt}" class="photos-wall-img" loading="lazy">
        <div class="pw-tape pw-tape-l"></div>
        <div class="pw-tape pw-tape-r"></div>
        <span class="pw-bigheart">✨</span>
        ${pic.special ? '<div class="photos-wall-special-tag">✨ special 👀</div>' : ''}
        <div class="photos-wall-react-overlay" id="photos-reactions-${idx}"></div>
      </div>
      <div class="photos-wall-meta" id="photos-meta-${idx}">
        <div class="photos-wall-meta-caption"></div>
        <div class="photos-wall-meta-date"></div>
      </div>
    `;

    // Copy reactions from hidden container after buttons are rendered
    grid.appendChild(frame);
  });

  // Render reactions into wall frames
  renderWallReactions();

  // Double-tap to react (first reaction)
  grid.querySelectorAll('.photos-wall-frame').forEach(fr => bindWallDoubleTap(fr));
}

function renderWallReactions() {
  PICS.forEach((_, idx) => {
    const src = document.getElementById('gif-reactions-' + idx);
    const dst = document.getElementById('photos-reactions-' + idx);
    if (src && dst) {
      dst.innerHTML = src.innerHTML;
      dst.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.onclick = e => { e.stopPropagation(); toggleGifReaction(btn, idx, btn.dataset.emoji); };
        if (userGifReactions[idx]?.[btn.dataset.emoji]) btn.classList.add('active');
      });
    }
  });
}

function updateStack() {
  // Re-render reactions after any update
  renderWallReactions();
}

function bindWallDoubleTap(fr) {
  let last = 0;
  const idx = Number(fr.dataset.idx);
  const onTap = () => {
    const now = Date.now();
    if (now - last < 320) {
      const heart = fr.querySelector('.pw-bigheart');
      if (heart) {
        heart.classList.remove('pop'); void heart.offsetWidth; heart.classList.add('pop');
        setTimeout(() => heart.classList.remove('pop'), 600);
      }
      toggleGifReaction(
        fr.querySelector('.reaction-btn'),
        idx,
        idx === SPECIAL_IDX ? SPECIAL_REACTIONS[0] : NORMAL_REACTIONS[0]
      );
    }
    last = now;
  };
  fr.addEventListener('click', onTap);
  fr.addEventListener('touchend', onTap);
}

// goToSlide kept for compatibility but does nothing in wall mode
function goToSlide() {}

// ============================================================
// GIF POPUP — fixes "showGifPopup is not defined"
// ============================================================
function showGifPopup(gifUrl, emoji) {
  const overlay = document.getElementById('gifPopupOverlay');
  const img     = document.getElementById('gifPopupImg');
  const emojiEl = document.getElementById('gifPopupEmoji');
  if (!overlay) return;
  if (emojiEl) emojiEl.textContent = emoji || '';
  if (img) {
    if (gifUrl) { img.src = gifUrl; img.style.display = ''; }
    else img.style.display = 'none';
  }
  overlay.classList.add('active');
  clearTimeout(window._gifPopupTimer);
  window._gifPopupTimer = setTimeout(() => overlay.classList.remove('active'), 3000);
  overlay.onclick = () => overlay.classList.remove('active');
}

function toggleGifReaction(btn, idx, emoji) {
  const wasActive = userGifReactions[idx][emoji];
  const delta = wasActive ? -1 : 1;
  userGifReactions[idx][emoji] = !wasActive;
  btn.classList.toggle('active', !wasActive);
  runTransaction(ref(db,`reactions/img${idx}/${emoji}`), v=>(v||0)+delta);
  saveState({ userGifReactions, userArtistReacts });
  if (!wasActive) {
    if (idx===SPECIAL_IDX) { SFX.specialReact(emoji); userArtistReacts[emoji]=true; saveState({userArtistReacts}); }
    else SFX.imgReact(emoji);
    showGifPopup(idx!==SPECIAL_IDX ? NORMAL_GIF_MAP[emoji] : null, emoji);
    showToast(`${emoji} reacted!`);
  }
}

for (let i = 0; i < PICS.length; i++) {
  onValue(ref(db, `reactions/img${i}`), snap => {
    const data = snap.val() || {};
    gifReactionState[i] = data;
    
    const reactions = i === SPECIAL_IDX ?
      [...NORMAL_REACTIONS, ...SPECIAL_REACTIONS] :
      NORMAL_REACTIONS;
    
    reactions.forEach(emoji => {
      const c = document.getElementById('gif-reactions-' + i);
      if (!c) return;
      
      c.querySelectorAll('.reaction-btn').forEach(btn => {
        if (btn.dataset.emoji !== emoji) return;
        
        const el = btn.querySelector('.count');
        const value = data[emoji] || 0;
        
        // text
        if (el) {
          el.textContent = value > 0 ? formatCount(value) : '';
        } else {
          btn.innerHTML = `${emoji} <span class="count">${value > 0 ? formatCount(value) : ''}</span>`;
        }
        
        // animation levels
        btn.classList.remove(
          'react-low', 'react-mid', 'react-high', 'react-insane', 'react-god'
        );
        
        if (value >= 1_000_000) {
          btn.classList.add('react-god');
        } else if (value >= 100_000) {
          btn.classList.add('react-insane');
        } else if (value >= 10_000) {
          btn.classList.add('react-high');
        } else if (value >= 1_000) {
          btn.classList.add('react-mid');
        } else if (value > 0) {
          btn.classList.add('react-low');
        }
      });
    });
    
    // ✅ SAFE update
    if (galleryReady) {
      updateStack();
    }
    
  }); // closes onValue
} // closes for loop
function spawnBurst(btn, emoji) {
  const rect = btn.getBoundingClientRect();

  for (let i = 0; i < 10; i++) {
    const el = document.createElement('div');
    el.className = 'burst-emoji';
    el.textContent = emoji;

    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    el.style.left = x + 'px';
    el.style.top = y + 'px';

    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 60;

    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    el.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0 }
    ], {
      duration: 700,
      easing: 'ease-out'
    });

    setTimeout(() => el.remove(), 700);
  }
}
function bigReact(btn, msg, idx) {
  const allBtns = document.querySelectorAll('.big-reaction-btn');
  
  // =========================
  // 🔁 TOGGLE LOGIC
  // =========================
  if (userRateChoice !== null) {
    if (allBtns[userRateChoice]) {
      allBtns[userRateChoice].classList.remove('active');
    }
    
    runTransaction(
      ref(db, `rateme/${RATE_KEYS[userRateChoice]}`),
      v => Math.max(0, (v || 0) - 1)
    );
    
    if (userRateChoice === idx) {
      userRateChoice = null;
      saveState({ userRateChoice: null });
      return;
    }
  }
  
  userRateChoice = idx;
  btn.classList.add('active');
  
  // ✅ THIS WAS MISSING (VERY IMPORTANT)
  runTransaction(
    ref(db, `rateme/${RATE_KEYS[idx]}`),
    v => (v || 0) + 1
  ).then(() => {
    console.log("✅ increment success");
  }).catch(err => {
    console.error("❌ increment failed:", err);
  });
  
  saveState({ userRateChoice: idx });
  
  // =========================
  // ✨ EFFECTS
  // =========================
  
  // 💥 click animation
  btn.classList.add('clicked');
  setTimeout(() => btn.classList.remove('clicked'), 350);
  
  // ✨ burst
  const emoji = btn.querySelector('.emoji')?.textContent || '✨';
  spawnBurst(btn, emoji);
  
  // 📳 screen shake
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 350);
  
  // 🔊 sound + toast
  SFX.rateMe(idx);
  showToast(msg + ' 🎀');
  
// 🎬 CHIBI REACTION
if (idx === 1 || idx === 4) {
  // 😠 bad reactions → angry
  playChibi('animations/angry.webm');
  chibiSay("hmph 😒");
} else {
  // 😊 good reactions → happy
  playChibi('animations/happy.webm');
  chibiSay("yaaay 💗");
}
}
// ============================================================
// MESSAGES
// ============================================================
let visibleMsgLimit = 10; // or 20
let sortMode       = 'date'; 
let pinnedMsgKey = null;

onValue(ref(db,'pinned'), snap => {
  pinnedMsgKey = snap.val();
  renderMessages();
});


async function sendMessage() {
  if (!currentUID) {
    showToast('not logged in 😤');
    return;
  }
  
  const input = document.getElementById('msgInput');
  const nameInput = document.getElementById('msgName');
  const useAnon = document.getElementById('anonToggle').checked;
  
  const text = input.value.trim();
  if (!text) {
    SFX.error();
    showToast('type something first! 😤');
    return;
  }
  
  const now = Date.now();
  
  try {
    // ✅ SEND MESSAGE ONLY (protected)
    await push(ref(db, 'messages'), {
      text,
      name: useAnon ? 'anonymous friend' : (nameInput.value.trim() || 'anonymous friend'),
      uid: currentUID,
      badgeIds: [...getEarnedBadges(
        userGifReactions,
        userArtistReacts,
        userMsgCount + 1,
        userRoleBadges
      )],
      time: now,
      timeText: new Date().toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      reactions: {},
      upvotes: 0,
      pinned: false
    });
    
  } catch (err) {
    console.error("MESSAGE ERROR:", err);
    showToast('error sending 😤');
    return; // ⛔ stop if message fails
  }
  
  // ✅ COOLDOWN OUTSIDE (cannot break message)
  try {
    await set(ref(db, 'userCooldowns/' + currentUID), now);
  } catch (e) {
    console.warn("Cooldown failed:", e);
  }
  
// ✅ UI updates
input.value = '';
userMsgCount++;
saveState({ userMsgCount });
_syncBadgesToFirebase();

SFX.messageSent();
showToast('message sent! 💌');
}
 
onValue(ref(db, 'messages'), snap => {
  const msgs = [];
  
  snap.forEach(child => {
    const data = child.val();
    const safeTime = data.time || data.timestamp || 0;
    
    msgs.push({
      _key: child.key,
      ...data,
      time: safeTime
    });
  });
  
  const DEBUG = false;

  if (DEBUG) {
  }

  allMessages = msgs;
renderMessages();
});
  // sort manually
function setSortMode(mode) {
  sortMode=mode;
  document.querySelectorAll('.sort-btn').forEach(b=>b.classList.toggle('active',b.dataset.sort===mode));
  renderMessages();
}

function getSortedMessages() {
  const pinned = allMessages.filter(m => m._key === pinnedMsgKey);
  const rest = allMessages.filter(m => m._key !== pinnedMsgKey);
  
  // 🔥 sort by newest (default)
  if (sortMode === 'date') {
    rest.sort((a, b) => b.time - a.time);
  }
  
  // 🔥 sort by upvotes
  if (sortMode === 'upvotes') {
    rest.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  }
  
  return [...pinned, ...rest];
}

function renderMessages() {
  const list = document.getElementById('messagesList');
  if(allMessages.length===0){
    list.innerHTML='<p class="loading-text">wala pang message... maging una! 🥺</p>';
    document.getElementById('seeMoreBtn').style.display='none';
    return;
  }
  const sorted=getSortedMessages();
  const visible=sorted.slice(0,visibleMsgLimit);
  list.innerHTML=visible.map(m=>renderMessage(m)).join('');
  document.getElementById('seeMoreBtn').style.display=sorted.length>visibleMsgLimit?'block':'none';

  // Async-load pfp avatars for visible senders (respects their showPfp preference)
  _loadPfpsInContainer(list);

  list.querySelectorAll('.badge-chip').forEach(chip=>{
    chip.addEventListener('click',e=>{e.stopPropagation();showBadgeTooltip(chip.dataset.badgeId,chip);});
  });
  list.querySelectorAll('.msg-react-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();toggleMsgReaction(btn.dataset.msgKey,btn.dataset.emoji,btn);});
    const key=btn.dataset.msgKey, em=btn.dataset.emoji;
    if(userMsgReacts[key]?.[em]) btn.classList.add('active');
  });
  list.querySelectorAll('.upvote-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();toggleUpvote(btn.dataset.msgKey,btn);});
    if(userUpvotes[btn.dataset.msgKey]) btn.classList.add('active');
  });
  list.querySelectorAll('.delete-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const key = btn.dataset.key;
    deleteMessage(key, btn.dataset.uid);
  });
});
  list.querySelectorAll('.pin-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();togglePin(btn.dataset.msgKey);});
  });
  // Reply toggle
  list.querySelectorAll('.reply-toggle-btn').forEach(btn => {
    const key = btn.dataset.msgKey;
    btn.addEventListener('click', e => { e.stopPropagation(); toggleReplyArea(key, btn); });
    listenToReplies(key, btn);
  });
  // Reply send
  list.querySelectorAll('.reply-send-btn').forEach(btn => {
    const key = btn.dataset.msgKey;
    btn.addEventListener('click', e => { e.stopPropagation(); sendReply(key); });
  });
  list.querySelectorAll('.reply-input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); sendReply(inp.id.replace('reply-input-', '')); }
    });
  });
  visible.forEach(m=>listenToMsgReactions(m._key));
}

// ============================================================
// 💬 REPLY SYSTEM
// ============================================================
const _replyListeners = new Set();

function toggleReplyArea(msgKey, btn) {
  const area = document.getElementById('reply-area-' + msgKey);
  if (!area) return;
  const open = area.style.display !== 'none';
  area.style.display = open ? 'none' : 'block';
  btn.classList.toggle('active', !open);
  if (!open) {
    const inp = document.getElementById('reply-input-' + msgKey);
    if (inp) inp.focus();
  }
}

function listenToReplies(msgKey, toggleBtn) {
  if (_replyListeners.has(msgKey)) return;
  _replyListeners.add(msgKey);

  onValue(ref(db, `messages/${msgKey}/replies`), snap => {
    const data = snap.val() || {};
    const replies = Object.entries(data)
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => (a.time || 0) - (b.time || 0));

    // Update toggle button label
    const btn = document.querySelector(`.reply-toggle-btn[data-msg-key="${msgKey}"]`);
    if (btn) {
      const countEl = btn.querySelector('.reply-count-label');
      if (countEl) countEl.textContent = replies.length > 0 ? `${replies.length} ` : '';
    }

    // Render reply list
    const list = document.getElementById('reply-list-' + msgKey);
    if (!list) return;
    if (!replies.length) { list.innerHTML = ''; return; }
    list.innerHTML = replies.map(r => `
      <div class="reply-item">
        <span class="reply-sender">${escapeHtml(r.name || 'anon')}${isAdmin(r.uid) ? ' 👑' : ''}</span>
        <span class="reply-text">${escapeHtml(r.text)}</span>
        <span class="reply-time">${formatTimeAgo(r.time, '')}</span>
      </div>
    `).join('');
  });
}

function sendReply(msgKey) {
  const inp = document.getElementById('reply-input-' + msgKey);
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  if (!currentUID) { showToast('still loading… try again'); return; }

  const savedName = loadState().userName || '';
  const name = savedName || 'anonymous friend';

  push(ref(db, `messages/${msgKey}/replies`), {
    text, name, uid: currentUID, time: Date.now(),
  }).then(() => {
    inp.value = '';
    SFX.messageSent?.();
  }).catch(err => {
    showToast('could not send reply 😤');
    console.error(err);
  });
}
function loadMore(){visibleMsgLimit+=5;renderMessages();}

function toggleUpvote(msgKey, btn) {
  const wasActive=userUpvotes[msgKey];
  userUpvotes[msgKey]=!wasActive;
  saveState({userUpvotes});
  btn.classList.toggle('active',!wasActive);
  runTransaction(ref(db,`messages/${msgKey}/upvotes`),v=>Math.max(0,(v||0)+(wasActive?-1:1)));
  if(!wasActive) SFX.upvote();
}

function togglePin(msgKey) {
const isMod = isAdmin(currentUID);// 🔥 your admin system

  if (!isMod) {
    showToast('only mods can pin! 🔒');
    return;
  }

  if (pinnedMsgKey === msgKey) {
    set(ref(db,'pinned'), null);
    showToast('message unpinned!');
  } else {
    set(ref(db,'pinned'), msgKey);
    showToast('message pinned! 📌');
  }
}
function toggleMsgReaction(msgKey, emoji, btn) {
  if(!userMsgReacts[msgKey]) userMsgReacts[msgKey]={};
  const wasActive=userMsgReacts[msgKey][emoji];
  userMsgReacts[msgKey][emoji]=!wasActive;
  saveState({userMsgReacts});
  btn.classList.toggle('active',!wasActive);
  const delta=wasActive?-1:1;
  btn.dataset.count=Math.max(0,(parseInt(btn.dataset.count)||0)+delta);
  updateReactBtn(btn,emoji,parseInt(btn.dataset.count));
  runTransaction(ref(db,`messages/${msgKey}/reactions/${emoji}`),v=>Math.max(0,(v||0)+delta));
  if(!wasActive) SFX.msgReact();
}

function listenToMsgReactions(msgKey) {
  if (_msgListeners.has(msgKey)) return; 
  _msgListeners.add(msgKey);

  onValue(ref(db,`messages/${msgKey}/reactions`),snap=>{
    const data=snap.val()||{};
    MSG_REACTIONS.forEach(emoji=>{
      const btn=document.querySelector(`.msg-react-btn[data-msg-key="${msgKey}"][data-emoji="${emoji}"]`);
      if(!btn) return;
      const count=data[emoji]||0;
      btn.dataset.count=count;
      updateReactBtn(btn,emoji,count);
    });
  });
  onValue(ref(db,`messages/${msgKey}/upvotes`),snap=>{
    const btn=document.querySelector(`.upvote-btn[data-msg-key="${msgKey}"]`);
    if(!btn) return;
    const count=snap.val()||0;
    const countEl=btn.querySelector('.upvote-count');
    if(countEl) countEl.textContent=count>0?formatCount(count):'';
  });
}

function formatTimeAgo(timestamp, fallbackText) {
  if (!timestamp || isNaN(timestamp)) {
    return fallbackText || '—';
  }

  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleTimeString('en-PH',{
    hour:'2-digit',
    minute:'2-digit'
  });
}

function renderMessage(m) {
  const isPinned=m._key===pinnedMsgKey;
const isUpvoted=userUpvotes[m._key];
const isMe = m._key === "-Or3WZtMegiCl5jcoipc";
const timeDisplay = isMe
  ? "77:77 AM ✨"
  : formatTimeAgo(m.time, m.timeText);
// 🔄 Badge resolution — always prefer live profileCache data.
//
// Priority:
//   1. profileCache[uid].earnedBadges  — live Firebase data, covers every user
//   2. __badgesAPI.getEarned()         — current user fallback if cache not yet populated
//   3. m.badgeIds                      — stale send-time snapshot, absolute last resort
//
// On a cache miss, _fetchProfileForBadges() fires a targeted get() for that uid
// and calls _repaintBadgeRowsForUid() when it resolves — no full re-render.
// NOTE: cached presence (not badge count) is the gate, so users with ZERO badges
// correctly show zero badges instead of falling through to stale m.badgeIds.
  let _rawBadgeIds = [];
  if (m.uid) {
    const cached = window.profileCache && window.profileCache[m.uid];
    if (cached) {
      // Profile is in cache — use earnedBadges directly (empty array is valid).
      _rawBadgeIds = cached.earnedBadges || [];
    } else {
      // Cache miss: fire a background fetch; render with best available data now.
      _fetchProfileForBadges(m.uid);
      if (m.uid === currentUID && window.__badgesAPI?.getEarned) {
        try { _rawBadgeIds = [...window.__badgesAPI.getEarned()]; } catch {}
      } else {
        _rawBadgeIds = m.badgeIds || [];
      }
    }
  } else {
    _rawBadgeIds = m.badgeIds || [];
  }
  // O(1) Map lookup replaces BADGE_ORDER.indexOf() per sort comparison.
  const badgeIds = _rawBadgeIds.slice().sort((a, b) =>
    (BADGE_ORDER_MAP.get(a) ?? 999) - (BADGE_ORDER_MAP.get(b) ?? 999)
  );
// Full badge HTML
const allBadgeHTML = badgeIds.map(id => {
  const b = getBadgeById(id);
  if (!b) return '';
  return `<span class="badge-chip ${b.anim}" data-badge-id="${id}" title="${b.label}">${b.icon}</span>`;
}).join('');

// ONLY top 3 inline
const inlineBadgeHTML = badgeIds.slice(0, 3).map(id => {
  const b = getBadgeById(id);
  if (!b) return '';
  return `<span class="badge-chip ${b.anim}" data-badge-id="${id}" title="${b.label}">${b.icon}</span>`;
}).join('');

const hasMoreBadges = badgeIds.length > 3;
const extraBadgeCount = badgeIds.length - 3;

  const msgReacts=m.reactions||{};
  const sortedReactions=[...MSG_REACTIONS].sort((a,b)=>(msgReacts[b]||0)-(msgReacts[a]||0));
  const reactHTML=sortedReactions.map(emoji=>{
    const count=msgReacts[emoji]||0;
    const tier=getMilestoneTier(count);
    const tierCls=tier?tier.cls:'';
    const display=count>0?(tier?`${formatCount(count)} ${tier.label}`:formatCount(count)):'';
    const isActive=userMsgReacts[m._key]?.[emoji]?'active':'';
    return `<button class="msg-react-btn ${tierCls} ${isActive}" data-msg-key="${m._key}" data-emoji="${emoji}" data-count="${count}">
      ${emoji}${display?`<span class="msg-react-count">${display}</span>`:''}
    </button>`;
  }).join('');

  const upvoteCount=m.upvotes||0;
  const isMod = isAdmin(currentUID);

const prestigeClass =
  (m.uid && window.profileCache?.[m.uid]?.equippedTitle) ?
  ' prestige-user' :
  '';

return `<div class="message-bubble ${isPinned?'pinned-msg':''}${prestigeClass}">
  
  ${isPinned?'<div class="pin-label">📌 Pinned</div>':''}
  
  <div class="msg-top-row">

    <div class="msg-meta">
      <div class="msg-pfp-avatar" data-pfp-uid="${m.uid || ''}"></div>
      
 <span class="msg-sender">
  ${isAdmin(m.uid)
    ? escapeHtml(m.name || 'anonymous friend') + ' <span class="admin-crown">👑</span>'
    : escapeHtml(m.name || 'anonymous friend')}

${inlineBadgeHTML
  ? `<span class="user-badges-inline">${inlineBadgeHTML}</span>`
  : ''}

${hasMoreBadges
  ? `<span class="badge-more-indicator"
      data-all-badges='${encodeURIComponent(allBadgeHTML)}'>
      +${extraBadgeCount}
    </span>`
  : ''}
</span>
      <span class="msg-time">${timeDisplay}</span>
    </div>

    <div class="msg-actions">
      <button class="upvote-btn ${isUpvoted?'active':''}" data-msg-key="${m._key}">
        ▲ <span class="upvote-count">${upvoteCount>0?formatCount(upvoteCount):''}</span>
      </button>

      <button class="reply-toggle-btn" data-msg-key="${m._key}">
        💬 <span class="reply-count-label"></span>Reply
      </button>

      ${(isAdmin(currentUID) || currentUID === m.uid) ? `
        <button 
          class="delete-btn" 
          data-key="${m._key}" 
          data-uid="${m.uid}"
        >🗑️</button>
      ` : ''}

      ${isMod ? `
        <button class="pin-btn" data-msg-key="${m._key}">
          ${isPinned ? '📌' : '📍'}
        </button>
      ` : ''}
    </div>

  </div>



  <div class="msg-text">${escapeHtml(m.text)}</div>

  <div class="msg-reactions-row">${reactHTML}</div>

  <!-- REPLY AREA (hidden by default) -->
  <div class="msg-reply-area" id="reply-area-${m._key}" style="display:none">
    <div class="reply-list" id="reply-list-${m._key}"></div>
    <div class="reply-form">
      <input class="reply-input" id="reply-input-${m._key}" type="text" placeholder="write a reply…" maxlength="200">
      <button class="reply-send-btn" data-msg-key="${m._key}">send 💌</button>
    </div>
  </div>

</div>`;
}

function showBadgeTooltip(badgeId, anchor) {
  const badge=getBadgeById(badgeId);
  if(!badge) return;
  let tip=document.getElementById('badgeTooltip');
  if(!tip){tip=document.createElement('div');tip.id='badgeTooltip';tip.className='badge-tooltip';document.body.appendChild(tip);}
  tip.innerHTML=`<strong>${badge.icon} ${badge.label}</strong><br><span>${badge.desc}</span>`;
  const rect=anchor.getBoundingClientRect();
  tip.style.top=(rect.bottom+window.scrollY+6)+'px';
  tip.style.left=Math.min(rect.left+window.scrollX,window.innerWidth-210)+'px';
  tip.classList.add('visible');
  setTimeout(()=>tip.classList.remove('visible'),3000);
}

document.getElementById('anonToggle').addEventListener('change',function(){
  document.getElementById('nameField').style.display=this.checked?'none':'block';
});
document.getElementById('msgName').addEventListener('blur',function(){
  const name=this.value.trim();
  if(!name) return;
  onValue(ref(db,'Roles/'+name),snap=>{
    const data=snap.val()||{};
    const fromName=Object.entries(data).filter(([,v])=>v===true).map(([k])=>k);
    userRoleBadges=[...new Set([...userRoleBadges,...fromName])];
  });
});

let typingTimeout;
document.getElementById('msgInput').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();return;}
  clearTimeout(typingTimeout);
  typingTimeout=setTimeout(()=>SFX.type(),10);
});

function showRateSite() {
  document.getElementById('rateSiteModal').classList.add('active');
}
function closeRateSite() {
  document.getElementById('rateSiteModal').classList.remove('active');
}
function submitStarRating(stars) {
  push(ref(db,'siteRatings'),{ stars, time:Date.now() });
  if(stars>=4) {
    showToast(`${stars}⭐ salamat! ✨`);
    setTimeout(()=>window.open('https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME','_blank'),800);
  } else {
    showToast(`${stars}⭐ thanks for the feedback!`);
  }
  closeRateSite();
  document.querySelectorAll('.star-btn').forEach((btn,i)=>{
    if(i<stars) btn.classList.add('rated');
  });
}

function showToast(msg) {
  const toast=document.getElementById('toast');
  toast.textContent=msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),2500);
}

initGallery();
galleryReady = true;

// 📝 Gallery metadata — admin sets captions + dates in Firebase console at galleryMeta/{idx}
onValue(ref(db, 'galleryMeta'), snap => {
  const data = snap.val() || {};
  Object.entries(data).forEach(([idx, meta]) => {
    const metaEl = document.getElementById('photos-meta-' + idx);
    if (!metaEl) return;
    const capEl  = metaEl.querySelector('.photos-wall-meta-caption');
    const dateEl = metaEl.querySelector('.photos-wall-meta-date');
    if (capEl)  capEl.textContent  = meta.caption || '';
    if (dateEl) dateEl.textContent = meta.date    || '';
  });
});

window.bigReact         = bigReact;
window.sendMessage      = sendMessage;
window.loadMore         = loadMore;
window.setSortMode      = setSortMode;
window.showRateSite     = showRateSite;
window.closeRateSite    = closeRateSite;
window.submitStarRating = submitStarRating;
window.goToSlide        = goToSlide;

function applyVelocityEffect(v) {
  const cards = document.querySelectorAll('.fact-card');

  cards.forEach((card, i) => {
    const direction = i % 2 === 0 ? 1 : -1;

    // clamp velocity so it doesn't go crazy
    const clamped = Math.max(-50, Math.min(50, v));

    const rotate = clamped * 0.3 * direction;
    const translate = clamped * 0.5 * direction;

    card.style.transform = `
      perspective(800px)
      translateX(${translate}px)
      rotateY(${rotate}deg)
      scale(1)
    `;
  });

  // reset back smoothly
  clearTimeout(window._velTimeout);
  window._velTimeout = setTimeout(() => {
    cards.forEach(card => {
      card.style.transform = '';
    });
  }, 120);
}


let lastScrollY = window.scrollY;
let velocity = 0;

window.addEventListener('scroll', () => {
  const currentY = window.scrollY;

  // calculate speed
  velocity = currentY - lastScrollY;
  lastScrollY = currentY;

  applyVelocityEffect(velocity);
});
const factCards = document.querySelectorAll('.fact-card');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const index = [...factCards].indexOf(entry.target);

    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('show');
      }, (index % 2 === 0 ? index * 180 : index * 260));
    } else {
      setTimeout(() => {
        entry.target.classList.remove('show');
      }, index * 120);
    }

  });
}, {
  threshold: 0.4,
  rootMargin: "0px 0px -120px 0px"
});

factCards.forEach(card => observer.observe(card));

window.bookService = function(name) {
  showToast("Booked: " + name + " 💗");

  // optional: open github issue
  window.open(
    "https://github.com/natpyydev/funfactsaboutme/issues/new?title=" 
    + encodeURIComponent("Service Request: " + name),
    "_blank"
  );
};

window.openFavorites = function() {
  document.getElementById('favoritesModal').classList.add('active');
};

window.closeFavorites = function() {
  document.getElementById('favoritesModal').classList.remove('active');
};

const PROJ_KEY = 'natnat_coding_projects';
function getProjects() { try { return JSON.parse(localStorage.getItem(PROJ_KEY) || '[]'); } catch { return []; } }
function saveProjects(arr) { localStorage.setItem(PROJ_KEY, JSON.stringify(arr)); }

function renderProjects() {
  const list = document.getElementById('codingProjectList');
  if (!list) return;
  const projects = getProjects();
  if (projects.length === 0) { list.innerHTML = ''; return; }
  list.innerHTML = projects.map((p, i) => {
    const isLink = p.link && p.link.startsWith('http');
    return `<div class="proj-item proj-item-deletable" style="position:relative">
      ${isLink
        ? `<a href="${p.link}" target="_blank" rel="noopener" style="text-decoration:none;display:block">
             <div class="proj-title">${p.title}</div>
             <div class="proj-link">${p.link}</div>
           </a>`
        : `<div class="proj-title">${p.title}</div><div class="proj-link">${p.link || 'no link'}</div>`}
      <button class="proj-delete-btn" onclick="deleteCodingProject(${i})" title="Remove">✕</button>
    </div>`;
  }).join('');
}

window.addCodingProject = function() {
  if (!isAdminNow()) { showToast('🔒 only the dev can add projects'); return; }
  const titleEl = document.getElementById('projectTitleInput');
  const linkEl  = document.getElementById('projectLinkInput');
  const title = (titleEl ? titleEl.value.trim() : '');
  const link  = (linkEl  ? linkEl.value.trim()  : '');
  if (!title) { if (titleEl) { titleEl.focus(); titleEl.style.borderColor = '#ff6b6b'; setTimeout(() => { titleEl.style.borderColor = ''; }, 1200); } return; }
  const projects = getProjects();
  projects.push({ title, link });
  saveProjects(projects);
  if (titleEl) titleEl.value = '';
  if (linkEl)  linkEl.value  = '';
  renderProjects();
};

window.deleteCodingProject = function(idx) {
  const projects = getProjects();
  projects.splice(idx, 1);
  saveProjects(projects);
  renderProjects();
};

window.showCodingProjects = function() {
  const m = document.getElementById('codingProjectsModal');
  if (!m) return;
  m.classList.add('active');
  renderProjects();
  // Hide add-project form for non-admins
  const form = m.querySelector('.proj-form');
  if (form) form.style.display = isAdminNow() ? '' : 'none';
};

window.closeCodingProjects = function() {
  const m = document.getElementById('codingProjectsModal');
  if (m) m.classList.remove('active');
};
let _chibiIdleTimer = null;
function playChibi(src, loop = false) {
  // Normalise: accept .webm paths and silently redirect to .gif
  src = src.replace(/\.webm$/i, '.gif');

  const chibi = document.getElementById('chibi');
  if (!chibi) return;

  // Don't interrupt a one-shot reaction with another one-shot
  if (chibiBusy && !loop) return;

  chibiBusy = !loop;
  isReacting = !loop;

  // Set new source only when it actually changes (avoids gif restart flicker)
  const current = chibi.getAttribute('data-src');
  if (current !== src) {
    chibi.setAttribute('data-src', src);
    chibi.src = src;
  }

  // For one-shot reactions, revert to idle after 2 s (GIFs can't fire onended)
  clearTimeout(_chibiIdleTimer);
  if (!loop) {
    _chibiIdleTimer = setTimeout(() => {
      chibiBusy = false;
      isReacting = false;
      playChibi('animations/idle.gif', true);
    }, 2000);
  }
}
// 🧠 CHIBI TALK SYSTEM
function isChibiSilenced() {
  // chibi is silenced if user hid it OR muted it in the music widget
  return localStorage.getItem('nat-chibi-hide') === '1'
      || localStorage.getItem('nat-chibi-mute') === '1';
}
window.chibiSay = function(text, duration = 4000) {
  const bubble = document.getElementById('chibiBubble');
  const chibi = document.getElementById('chibi');

  if (!bubble) return;

  bubble.classList.add('chibi-show');

  const silenced = isChibiSilenced();
  const onChibiTab = localStorage.getItem('nat-tab') === 'chibi';

  // 💬 bubble pop (only on chibi tab + not muted)
  if (window.SFX && !silenced && onChibiTab) SFX.message();

  bubble.textContent = "";

let i = 0;

const typing = setInterval(() => {
  if (i >= text.length) {
    clearInterval(typing);
    return;
  }

  bubble.textContent += text[i];

  if (window.SFX && !silenced && onChibiTab) {
    SFX.type();
  }

  i++;
}, 50);

  setTimeout(() => {
    bubble.classList.remove('chibi-show');
  }, duration);
};



// 👇 VERY BOTTOM OF app.js
window.addEventListener('DOMContentLoaded', () => {

  // 🔥 scroll reveal init (merged from earlier listener)
  initScrollReveal();

  const chibi = document.getElementById('chibi');
  if (!chibi) return;

  // Expose playChibi so chibi-wander.js can use it
  window.playChibi = playChibi;

  // ▶️ start idle gif animation (respect hide setting)
  if (localStorage.getItem('nat-chibi-hide') !== '1') {
    playChibi('animations/idle.gif', true);
  }

  // 🔓 unlock audio + video (FIRST CLICK REQUIRED)
  document.body.addEventListener('click', () => {

    // unlock typing audio (silent play)
    const unlock = new Audio('audio/type.mp3');
    unlock.volume = 0;
    unlock.play().catch(()=>{});

    // background music
    const bg = document.getElementById('bgMusic');
    if (bg) {
      bg.muted = false;
      bg.volume = 0.2; // 🔥 keep low so SFX is audible
      bg.play().catch(()=>{});
    }

    // chibi is an <img> tag — no .play() method, skip

  }, { once: true });

  // 🎲 idle talking loop — respects hide/mute/tab-visibility
  setInterval(() => {
    // Skip if chibi is hidden or user is on another tab
    if (localStorage.getItem('nat-chibi-hide') === '1') return;
    if (document.hidden) return;
    if (
      isReacting ||
      document.getElementById('chibiBubble')?.classList.contains('chibi-show')
    ) return;

    const lines = [
      "hmm… 👀",
      "ano ginagawa mo 👀",
      "nakatingin ka lang? 😒",
      "hehe 💗"
    ];

    window.chibiSay(lines[Math.floor(Math.random() * lines.length)]);
  }, 5000);

  // 🔇 Mute: hide chibi img when nat-chibi-hide=1
  function applyChibiHide() {
    const hidden = localStorage.getItem('nat-chibi-hide') === '1';
    const chibiEl = document.getElementById('chibi');
    const wrap    = document.getElementById('chibiWrap');
    if (chibiEl) chibiEl.style.visibility = hidden ? 'hidden' : '';
    if (wrap)    wrap.style.visibility    = hidden ? 'hidden' : '';
    if (!hidden && chibiEl && chibiEl.src.indexOf('idle.gif') === -1 && !chibiBusy) {
      playChibi('animations/idle.gif', true);
    }
  }
  applyChibiHide();
  // React to settings changes from other parts of the page
  window.addEventListener('natChibiSettingChange', applyChibiHide);

  // chibi is an <img>, no pause/ended events needed

});

window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
  
  // ✅ show chibi ONLY after page is ready
  document.body.classList.add('loaded');
});

/* =========================================================
   ⭐ SERVICES SYSTEM (ANIMATED + SAVED + HOT BADGE)
   ========================================================= */

const serviceData = {}; // in-memory cache

/* ======================
   💾 LOAD / SAVE
   ====================== */

function loadService(id) {
  const saved = localStorage.getItem("service-" + id);
  return saved ? JSON.parse(saved) : { stars: 0, hearts: 0 };
}

function saveService(id) {
  localStorage.setItem("service-" + id, JSON.stringify(serviceData[id]));
}

/* ======================
   ✨ ANIMATED COUNTER
   ====================== */

function animateCount(el, start, end) {
  let current = start;
  const step = () => {
    current++;
    el.textContent = current;
    if (current < end) requestAnimationFrame(step);
  };
  step();
}

/* ======================
   🔥 HOT BADGE
   ====================== */

function updateHotBadge(id) {
  const row = document.querySelector(`[data-id="${id}"]`);
  if (!row) return;

  let badge = row.querySelector(".hot-badge");

  // ✅ SAFE COMBINED SCORE
  const hearts = serviceData[id]?.hearts || 0;
  const stars  = serviceData[id]?.stars || 0;
  const score  = hearts + stars;

  // ❌ REMOVE if not hot
  if (score < 20) {
  if (badge) badge.remove();
  row.classList.remove("best-seller");
  return;
}

  // ➕ CREATE if missing
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "hot-badge";
    row.appendChild(badge);
  }

  // 🔥 TIERS — badge label + CSS class
  badge.className = "hot-badge svc-hottest-badge";
  if (score >= 200) {
    badge.innerHTML = 'LEGENDARY';
    badge.style.cssText = 'font-size:10px;animation-duration:1.4s';
  } else if (score >= 100) {
    badge.innerHTML = 'TRENDING';
  } else if (score >= 50) {
    badge.innerHTML = 'HOT';
  } else {
    badge.innerHTML = 'POPULAR';
    badge.style.animationDuration = '3.5s';
  }
  row.classList.add("best-seller");
}


/* ======================
   ⭐ RATE
   ====================== */

window.rateService = function(id, btn) {
  if (!serviceData[id]) serviceData[id] = loadService(id);

  const span = document.getElementById("star-" + id);
  const prev = serviceData[id].stars || 0;

  serviceData[id].stars = prev + 1;
  animateCount(span, prev, serviceData[id].stars);
  saveService(id);
  updateHotBadge(id);

  // ⭐ combo + effects (calls enhanceClick after combo system is defined)
  if (typeof enhanceClick === 'function') enhanceClick(id, btn, 'star');
  else {
    spawnRipple?.(btn);
    bumpCombo?.(id, btn, 'star');
  }

  // 🌐 sync global totals
  runTransaction(ref(db, 'serviceStars/' + id), v => (v || 0) + 1).catch(() => {});
};


/* ======================
   ❤️ HEART
   ====================== */

window.heartService = function(id, btn) {
  if (!serviceData[id]) serviceData[id] = loadService(id);

  const span = document.getElementById("heart-" + id);
  const prev = serviceData[id].hearts || 0;

  serviceData[id].hearts = prev + 1;
  animateCount(span, prev, serviceData[id].hearts);
  saveService(id);
  updateHotBadge(id);

  // ❤️ combo + effects
  if (typeof enhanceClick === 'function') enhanceClick(id, btn, 'heart');
  else {
    spawnRipple?.(btn);
    bumpCombo?.(id, btn, 'heart');
  }

  // 🌐 sync global totals
  runTransaction(ref(db, 'serviceHearts/' + id), v => (v || 0) + 1).catch(() => {});
};


/* ======================
   🚀 INIT ON LOAD
   ====================== */

window.addEventListener("DOMContentLoaded", () => {
  const rows = document.querySelectorAll(".service-row");

  rows.forEach(row => {
    const id = row.dataset.id;
    if (!id) return;

    const data = loadService(id);
    serviceData[id] = data;

    const starEl = document.getElementById("star-" + id);
    const heartEl = document.getElementById("heart-" + id);

    if (starEl) starEl.textContent = data.stars || 0;
    if (heartEl) heartEl.textContent = data.hearts || 0;

    // 🔥 run for ALL services
    updateHotBadge(id);
  });
});

// =========================================================
// ✨ SERVICES v2 — combo, floaters, ripple, hot-badge tiers
// + 🏆 LEADERBOARD (ranks PEOPLE by message engagement)
// + 🎖 COMBO BADGES (lifetime combo tiers)
// All ADDITIONS — no redeclarations.
// =========================================================

// ---------- combo state (per service, resets after 2.2s) ----------
const comboState = {};
const COMBO_RESET_MS = 2200;

// ---------- per-user lifetime combo total (synced to Firebase) ----------
let userCombosCache = {};   // { uid: totalCombos }
let myComboTotal = 0;       // current user's combo total
const LOCAL_COMBO_KEY = 'natnat_my_combo_total';

try { myComboTotal = parseInt(localStorage.getItem(LOCAL_COMBO_KEY) || '0', 10) || 0; } catch {}

// listen to all users' combo totals (used by leaderboard)
onValue(ref(db, 'userCombos'), snap => {
  userCombosCache = snap.val() || {};
  // re-render leaderboard so badges update for everyone
  renderLeaderboard();
});

// ---------- floating +N indicator ----------
function floatPlus(btn, text, type) {
  const row = btn.closest('.service-row');
  if (!row) return;
  const el = document.createElement('div');
  el.className = 'svc-float ' + (type || '');
  el.textContent = text;

  const rowRect = row.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  el.style.left = (btnRect.left - rowRect.left + btnRect.width / 2) + 'px';
  el.style.top  = (btnRect.top  - rowRect.top) + 'px';

  row.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ---------- ripple ----------
function spawnRipple(btn) {
  const r = document.createElement('span');
  r.className = 'svc-ripple';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ---------- combo bubble + tracking ----------
function bumpCombo(id, btn, type) {
  const now = Date.now();
  let c = comboState[id];

  if (!c || (now - c.lastHit) > COMBO_RESET_MS) {
    c = comboState[id] = { count: 0, type, lastHit: now, timer: null };
  }
  c.count++;
  c.type = type;
  c.lastHit = now;

  // 💾 lifetime combo total: every click in a streak adds +1
  myComboTotal++;
  try { localStorage.setItem(LOCAL_COMBO_KEY, String(myComboTotal)); } catch {}

  // 🌐 sync to Firebase (so leaderboard shows everyone's badges)
  if (currentUID) {
    runTransaction(ref(db, 'userCombos/' + currentUID), v => (v || 0) + 1)
      .catch(() => {});
  }

  // 🎖 if user just unlocked a new tier, celebrate
  const prevBadge = getComboBadge(myComboTotal - 1);
  const nowBadge  = getComboBadge(myComboTotal);
  if (nowBadge && (!prevBadge || prevBadge.id !== nowBadge.id)) {
    showComboUnlock(nowBadge);
  }

  const row = btn.closest('.service-row');
  if (row) {
    let bubble = row.querySelector('.svc-combo');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'svc-combo';
      row.appendChild(bubble);
    }
    bubble.classList.toggle('fire', c.count >= 5);
    bubble.textContent = c.count >= 3 ? `COMBO x${c.count} 🔥` : `+${c.count}`;
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = '';
  }

  clearTimeout(c.timer);
  c.timer = setTimeout(() => {
    const row2 = document.querySelector(`[data-id="${id}"]`);
    row2?.querySelector('.svc-combo')?.remove();
    delete comboState[id];
  }, COMBO_RESET_MS);
}

// ---------- 🎖 unlock toast ----------
function showComboUnlock(badge) {
  const t = document.createElement('div');
  t.className = 'combo-unlock-toast';
  t.innerHTML = `
    <div class="cu-icon ${badge.className}">${badge.icon}</div>
    <div class="cu-body">
      <div class="cu-title">NEW BADGE UNLOCKED</div>
      <div class="cu-name">${badge.icon} ${badge.name}</div>
    </div>
  `;
  document.body.appendChild(t);
  if (window.SFX?.messageSent) try { SFX.messageSent(); } catch {}
  setTimeout(() => t.classList.add('show'), 20);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 3500);
}

// ---------- enhanced click effects ----------
function enhanceClick(id, btn, type) {
  btn.classList.add('clicked', type === 'star' ? 'glow-star' : 'glow-heart');
  setTimeout(() => btn.classList.remove('clicked'), 400);
  setTimeout(() => btn.classList.remove('glow-star', 'glow-heart'), 700);

  spawnRipple(btn);
  floatPlus(btn, type === 'star' ? '+1 ⭐' : '+1 ❤️', type);
  bumpCombo(id, btn, type);

  if (typeof spawnBurst === 'function') {
    spawnBurst(btn, type === 'star' ? '⭐' : '❤️');
  }

  if (window.SFX) {
    if (type === 'star')  SFX.upvote?.();
    if (type === 'heart') SFX.msgReact?.();
  }

  upgradeHotBadgeTier(id);
}

// ---------- hot badge TIER upgrade (NOT a redefinition of updateHotBadge) ----------
function upgradeHotBadgeTier(id) {
  const row = document.querySelector(`[data-id="${id}"]`);
  if (!row) return;
  const badge = row.querySelector('.hot-badge');
  if (!badge) return;

  const score = (serviceData[id]?.hearts || 0) + (serviceData[id]?.stars || 0);
  badge.classList.toggle('trending', score >= 100 && score < 500);
  badge.classList.toggle('volcanic', score >= 500);
  if (score >= 500 && !badge.dataset.volcanic) {
    badge.textContent = '🌋 VOLCANIC';
    badge.dataset.volcanic = '1';
  }
}

// ---------- 🏆 LEADERBOARD (people, by message engagement) ----------
function getUserLeaderboard(limit = 100) {
  const tally = {};

  // ── from messages ──
  (allMessages || []).forEach(m => {
    const name = (m.name || 'anonymous friend').trim() || 'anonymous friend';
    const key  = (m.uid && m.uid !== 'undefined') ? m.uid : 'name:' + name;
    if (!tally[key]) tally[key] = { uid: m.uid, name, score: 0, upvotes: 0, reactions: 0, msgs: 0 };
    const upvotes   = m.upvotes || 0;
    const reactions = Object.values(m.reactions || {}).reduce((s, n) => s + (Number(n) || 0), 0);
    tally[key].upvotes   += upvotes;
    tally[key].reactions += reactions;
    tally[key].score     += upvotes + reactions;
    tally[key].msgs      += 1;
    tally[key].name = name;
  });

  // ── merge in ALL Firebase users that appear in any cache ──
  // This ensures the Stars/Hearts/Combos/Game leaderboards show ALL users,
  // not just people who left messages.
  const allCaches = [
    userCombosCache    || {},
    userStarsCache     || {},
    userHeartsCache    || {},
    userGameScoresCache|| {},
  ];
  allCaches.forEach(cache => {
    Object.keys(cache).forEach(uid => {
      if (!uid || uid === 'undefined') return;
      if (!tally[uid]) {
        // Try to get display name from profileCache (populated by the profile listener)
        const prof = (window.profileCache && window.profileCache[uid]) || {};
        tally[uid] = { uid, name: prof.name || 'visitor', score: 0, upvotes: 0, reactions: 0, msgs: 0 };
      }
    });
  });

  // Sort: message-senders first (by score desc), cache-only users at the bottom
  return Object.values(tally)
    .sort((a, b) => {
      // Primary: score desc (0-score cache users sink to bottom)
      if (b.score !== a.score) return b.score - a.score;
      // Secondary: name asc for stable ordering
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, limit);
}


function renderLeaderboard(limit = 10) {
  const list = document.getElementById('leaderboardList');
  if (!list) return;

  const ranked = getUserLeaderboard(limit);

  if (!ranked.length) {
    list.innerHTML = '<p class="loading-text" style="text-align:center;opacity:.6">walang nag-iiwan ng message pa… 👀</p>';
    renderMyComboPanel();
    return;
  }

  const max = ranked[0].score || 1;
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  list.innerHTML = ranked.map((u, i) => {
    const pct       = Math.round((u.score / max) * 100);
    const isMe      = u.uid === currentUID;
    const isDevUser = isAdmin(u.uid);
    const safe      = escapeHtml(u.name);
    const combos    = (u.uid && userCombosCache[u.uid]) || 0;
    const comboHTML = renderComboBadgeHTML(combos);

    return `
      <div class="lb-row lb-${i+1} ${isMe ? 'lb-me' : ''}" data-lb-key="${u.uid || u.name}">
        <div class="lb-medal">${medals[i] || '✨'}</div>
        ${u.uid ? `<div class="lb-pfp-avatar" data-pfp-uid="${u.uid}"></div>` : ''}
        <div class="lb-name">
          ${safe}${isDevUser ? ' <span class="admin-crown">👑</span>' : ''}${isMe ? ' <span style="opacity:.6;font-weight:600">(you)</span>' : ''}
          <div class="lb-meta">▲ ${u.upvotes} · 💬 ${u.reactions} · 📩 ${u.msgs}</div>
          ${comboHTML ? `<div class="lb-badges">${comboHTML}</div>` : ''}
        </div>
        <div class="lb-score">${u.score}</div>
        <div class="lb-bar"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join('');

  _loadPfpsInContainer(list);

  renderMyComboPanel();
}

// ---------- 🎖 "Your combo progress" panel under the leaderboard ----------
function renderMyComboPanel() {
  const panel = document.getElementById('myComboPanel');
  if (!panel) return;

  const cur  = getComboBadge(myComboTotal);
  const next = getNextComboTier(myComboTotal);
  const total = myComboTotal.toLocaleString();

  const pct = next
    ? Math.min(100, Math.round((myComboTotal / next.min) * 100))
    : 100;

  panel.innerHTML = `
    <div class="mycombo-head">
      <span class="mycombo-label">🎖 Your combo journey</span>
      <span class="mycombo-total">${total} combos</span>
    </div>
    <div class="mycombo-row">
      <div class="mycombo-current">
        ${cur
          ? `<span class="combo-badge ${cur.className}">${cur.icon} ${cur.name}</span>`
          : `<span style="opacity:.6">no badge yet — click those ⭐❤️ 👀</span>`}
      </div>
      <div class="mycombo-next">
        ${next
          ? `next: <b>${next.icon} ${next.name}</b> @ ${next.min.toLocaleString()}`
          : `<b>MAXED OUT 🌌</b>`}
      </div>
    </div>
    <div class="mycombo-bar"><span style="width:${pct}%"></span></div>
  `;
}

// ---------- bump animation when a row's score changes ----------
function bumpLeaderboardRow(key) {
  const row = document.querySelector(`#leaderboardList [data-lb-key="${key}"]`);
  if (!row) return;
  row.classList.remove('bump');
  void row.offsetWidth;
  row.classList.add('bump');
}

// ---------- WRAP existing renderMessages so leaderboard auto-refreshes ----------
const _origRenderMessages_v2 = renderMessages;
renderMessages = function() {
  _origRenderMessages_v2.apply(this, arguments);
  renderLeaderboard();
};

// ---------- WRAP existing window.rateService / heartService ----------
const _origRateService_v2  = window.rateService;
const _origHeartService_v2 = window.heartService;

window.rateService = function(id, btn) {
  _origRateService_v2(id, btn);
  enhanceClick(id, btn, 'star');
};

window.heartService = function(id, btn) {
  _origHeartService_v2(id, btn);
  enhanceClick(id, btn, 'heart');
};

// ---------- initial paint ----------
window.addEventListener('DOMContentLoaded', () => {
  renderLeaderboard();
  renderMyComboPanel();
  document.querySelectorAll('.service-row').forEach(r => {
    if (r.dataset.id) upgradeHotBadgeTier(r.dataset.id);
  });
});


// expose closers/handlers for inline onclick
window.closeGame = closeGame;
window.closeChat = closeChat;
window.clearChatHistory = clearChatHistory;
window.openRoleLogin = () => document.getElementById('roleLoginOverlay')?.classList.remove('hidden');
window.closeRoleLogin = () => document.getElementById('roleLoginOverlay')?.classList.add('hidden');
window.logoutRole = () => { clearRole(); applyRoleUI(); window.closeRoleLogin(); };

window.tryRoleSubmit = async function() {
  const input = document.getElementById('roleLoginInput');
  const status = document.getElementById('roleLoginStatus');
  if (!input || !status) return;
  status.textContent = 'checking…';
  const role = await tryUnlockRole(input.value);
  if (role) {
    status.innerHTML = `✅ unlocked: ${ROLES[role].icon} <b>${ROLES[role].name}</b>`;
    input.value = '';
    applyRoleUI();
    setTimeout(window.closeRoleLogin, 800);
  } else {
    status.textContent = '❌ wrong passcode';
  }
};

window.openNatGame = () => openGame(() => {
  const v = parseInt(localStorage.getItem('natnat_my_combo_total') || '0', 10) || 0;
  return v;
});
window.openNatChat = () => openChat();

window.sendChatNat = function(preset) {
  const inp = document.getElementById('chatNatInput');
  if (!inp) return;
  const v = preset || inp.value;
  inp.value = '';
  sendChatMessage(v);
};

// ---------- apply role-specific UI ----------
function applyRoleUI() {
  const role = getCurrentRole();
  const chipMount = document.getElementById('roleBadgeMount');
  if (chipMount) chipMount.innerHTML = role ? renderRoleChipHTML(role) : '';

  // Mod / Dev — comment-filter buttons on each message
  document.body.classList.toggle('perk-filter', hasPerk('canFilter'));
  // Debugger / Dev — visible console overlay
  document.body.classList.toggle('perk-debug', hasPerk('canDebug'));
  // Badgemaker / Dev — badge editor button (if you build one later)
  document.body.classList.toggle('perk-badges', hasPerk('canMakeBadges'));

  // mount/unmount the on-page console for debuggers
  if (hasPerk('canDebug')) mountDebugConsole();
  else unmountDebugConsole();
}

// ---------- 🐛 in-page console for Debugger role ----------
let _origConsole = null;
function mountDebugConsole() {
  if (document.getElementById('debugConsole')) return;
  const box = document.createElement('div');
  box.id = 'debugConsole';
  box.innerHTML = `
    <div class="dbg-head">
      🐛 console <button onclick="document.getElementById('debugConsole').classList.toggle('mini')">_</button>
      <button onclick="document.getElementById('debugLog').innerHTML=''">clear</button>
    </div>
    <div id="debugLog"></div>`;
  document.body.appendChild(box);

  _origConsole = { log: console.log, warn: console.warn, error: console.error };
  const push = (kind, args) => {
    _origConsole[kind].apply(console, args);
    const log = document.getElementById('debugLog');
    if (!log) return;
    const line = document.createElement('div');
    line.className = 'dbg-line dbg-' + kind;
    line.textContent = '[' + kind + '] ' + Array.from(args)
      .map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };
  console.log   = (...a) => push('log',   a);
  console.warn  = (...a) => push('warn',  a);
  console.error = (...a) => push('error', a);
}
function unmountDebugConsole() {
  const box = document.getElementById('debugConsole');
  if (box) box.remove();
  if (_origConsole) {
    console.log   = _origConsole.log;
    console.warn  = _origConsole.warn;
    console.error = _origConsole.error;
    _origConsole = null;
  }
}

// init on load
window.addEventListener('DOMContentLoaded', applyRoleUI);

// =========================================================
// 🌐 GLOBAL SERVICE TOTALS (Firebase-synced) +
// 🏆 LEADERBOARD SORT (Best Overall / Combos / Game) +
// 🎮 GAME SCORE SYNC
// =========================================================

const globalServiceStars = {};
const globalServiceHearts = {};
const userGameScoresCache = {};

// ---------- live listeners: serviceStars / serviceHearts (global totals) ----------
onValue(ref(db, 'serviceStars'), snap => {
  const data = snap.val() || {};
  Object.keys(globalServiceStars).forEach(k => { if (!(k in data)) delete globalServiceStars[k]; });
  Object.assign(globalServiceStars, data);
  Object.entries(data).forEach(([id, count]) => {
    const el = document.getElementById('star-' + id);
    if (el) el.textContent = count;
    if (!serviceData[id]) serviceData[id] = { stars: 0, hearts: 0 };
    serviceData[id].stars = count;
    try { updateHotBadge(id); } catch {}
    try { upgradeHotBadgeTier(id); } catch {}
  });
});

onValue(ref(db, 'serviceHearts'), snap => {
  const data = snap.val() || {};
  Object.keys(globalServiceHearts).forEach(k => { if (!(k in data)) delete globalServiceHearts[k]; });
  Object.assign(globalServiceHearts, data);
  Object.entries(data).forEach(([id, count]) => {
    const el = document.getElementById('heart-' + id);
    if (el) el.textContent = count;
    if (!serviceData[id]) serviceData[id] = { stars: 0, hearts: 0 };
    serviceData[id].hearts = count;
    try { updateHotBadge(id); } catch {}
    try { upgradeHotBadgeTier(id); } catch {}
  });
});

// ---------- live listener: user best game scores ----------
onValue(ref(db, 'userGameScores'), snap => {
  const data = snap.val() || {};
  Object.keys(userGameScoresCache).forEach(k => delete userGameScoresCache[k]);
  Object.assign(userGameScoresCache, data);
  renderLeaderboard();
});

// ---------- 3rd-layer wrap: sync each click to Firebase global totals ----------
const _origRate_v3  = window.rateService;
const _origHeart_v3 = window.heartService;

window.rateService = function(id, btn) {
  _origRate_v3(id, btn);
  if (currentUID) {
    runTransaction(ref(db, 'serviceStars/'  + id), v => (v || 0) + 1).catch(() => {});
  }
};
window.heartService = function(id, btn) {
  _origHeart_v3(id, btn);
  if (currentUID) {
    runTransaction(ref(db, 'serviceHearts/' + id), v => (v || 0) + 1).catch(() => {});
  }
};

// ---------- expose game-score saver for game.js ----------
window.saveGameScore = function(score) {
  if (!currentUID || !Number.isFinite(score)) return;
  runTransaction(ref(db, 'userGameScores/' + currentUID), v => Math.max(v || 0, score))
    .catch(() => {});
};

// ---------- 🏆 LEADERBOARD SORT ----------
let leaderboardSort = 'stars';

window.setLeaderboardSort = function(mode) {
  leaderboardSort = mode;
  document.querySelectorAll('.lb-sort-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === mode);
  });
  const lbl = document.getElementById('lbSortLabel');
  if (lbl) lbl.textContent = '— ' + (
    mode === 'combos' ? 'Highest Combos' :
    mode === 'game'   ? 'Highest Game Points' :
                        'Best Overall'
  );
  renderLeaderboard();
};

// ---------- replace renderLeaderboard with sort-aware version ----------
const _origRenderLeaderboard_v3 = renderLeaderboard;
renderLeaderboard = function(limit = 10) {
  const list = document.getElementById('leaderboardList');
  if (!list) return;

  const all = getUserLeaderboard(100);
  all.forEach(u => {
    u.combos    = (u.uid && userCombosCache[u.uid])    || 0;
    u.gameScore = (u.uid && userGameScoresCache[u.uid]) || 0;
  });

  let sorted, valueOf, valueLabel, emptyMsg;
  if (leaderboardSort === 'combos') {
    sorted = all.filter(u => u.combos > 0)
                .sort((a, b) => b.combos - a.combos)
                .slice(0, limit);
    valueOf    = u => u.combos;
    valueLabel = u => `🎖 ${u.combos.toLocaleString()}`;
    emptyMsg   = 'no combos yet — go click those ⭐❤️ 👀';
  } else if (leaderboardSort === 'game') {
    sorted = all.filter(u => u.gameScore > 0)
                .sort((a, b) => b.gameScore - a.gameScore)
                .slice(0, limit);
    valueOf    = u => u.gameScore;
    valueLabel = u => `🎮 ${u.gameScore.toLocaleString()}`;
    emptyMsg   = 'no one\'s played the game yet 🎮 be the first!';
  } else if (leaderboardSort === 'stars') {
    all.forEach(u => { u.starsGiven = (u.uid && userStarsCache[u.uid]) || 0; });
    sorted = all.filter(u => u.starsGiven > 0)
                .sort((a, b) => b.starsGiven - a.starsGiven)
                .slice(0, limit);
    valueOf    = u => u.starsGiven;
    valueLabel = u => `⭐ ${u.starsGiven.toLocaleString()}`;
    emptyMsg   = 'no one has given stars yet ⭐';
  } else if (leaderboardSort === 'hearts') {
    all.forEach(u => { u.heartsGiven = (u.uid && userHeartsCache[u.uid]) || 0; });
    sorted = all.filter(u => u.heartsGiven > 0)
                .sort((a, b) => b.heartsGiven - a.heartsGiven)
                .slice(0, limit);
    valueOf    = u => u.heartsGiven;
    valueLabel = u => `❤️ ${u.heartsGiven.toLocaleString()}`;
    emptyMsg   = 'no hearts given yet ❤️ spread the love!';
  } else {
    // Overall: game score + combos only (NOT upvotes/reactions)
    all.forEach(u => {
      u.gameTotal = (u.combos || 0) + (u.gameScore || 0);
    });
    sorted = all.filter(u => u.gameTotal > 0)
                .sort((a, b) => b.gameTotal - a.gameTotal)
                .slice(0, limit);
    if (!sorted.length) {
      // fallback: show everyone even if 0
      sorted = all.sort((a, b) => b.msgs - a.msgs).slice(0, limit);
    }
    valueOf    = u => u.gameTotal;
    valueLabel = u => `🎮 ${u.gameTotal.toLocaleString()}`;
    emptyMsg   = 'play the game to get on the leaderboard! 🎮';
  }

  if (!sorted.length) {
    list.innerHTML = `<p class="loading-text" style="text-align:center;opacity:.6">${emptyMsg}</p>`;
    renderMyComboPanel();
    return;
  }

  const max = valueOf(sorted[0]) || 1;
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  list.innerHTML = sorted.map((u, i) => {
    const v = valueOf(u);
    const pct = Math.round((v / max) * 100);
    const isMe = u.uid === currentUID;
    const isDevUser = isAdmin(u.uid);
    const safe = escapeHtml(u.name);
    const comboHTML = renderComboBadgeHTML(u.combos);
    const isVipUser = window.isVIP ? window.isVIP(u.uid) : false;
    const meta = [
      u.combos    ? `🎖 ${u.combos.toLocaleString()}`    : null,
      u.gameScore ? `🎮 ${u.gameScore.toLocaleString()}` : null,
    ].filter(Boolean).join(' · ') || '—';

    return `
      <div class="lb-row lb-${i+1} ${isMe ? 'lb-me' : ''}" data-lb-key="${u.uid || u.name}">
        <div class="lb-medal">${medals[i] || '✨'}</div>
        ${u.uid ? `<div class="lb-pfp-avatar" data-pfp-uid="${u.uid}"></div>` : ''}
        <div class="lb-name">
          ${safe}${isDevUser ? ' <span class="admin-crown">👑</span>' : ''}${isVipUser ? ' <span class="lb-vip-diamond">💎</span>' : ''}${isMe ? ' <span style="opacity:.6;font-weight:600">(you)</span>' : ''}
          <div class="lb-meta">${meta}</div>
          ${comboHTML ? `<div class="lb-badges">${comboHTML}</div>` : ''}
        </div>
        <div class="lb-score">${valueLabel(u)}</div>
        <div class="lb-bar"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join('');

  _loadPfpsInContainer(list);

  // "see more / show less" button
  let seeMoreBtn = document.getElementById('lbSeeMoreBtn');
  if (!seeMoreBtn) {
    seeMoreBtn = document.createElement('button');
    seeMoreBtn.id = 'lbSeeMoreBtn';
    seeMoreBtn.className = 'lb-see-more-btn';
    list.after(seeMoreBtn);
  }
  const totalAll = (leaderboardSort === 'combos' ? all.filter(u => u.combos > 0) :
                    leaderboardSort === 'game'   ? all.filter(u => u.gameScore > 0) :
                    leaderboardSort === 'stars'  ? all.filter(u => u.starsGiven > 0) :
                    leaderboardSort === 'hearts' ? all.filter(u => u.heartsGiven > 0) :
                    all.filter(u => u.gameTotal > 0)).length;
  if (totalAll > limit) {
    seeMoreBtn.style.display = '';
    seeMoreBtn.textContent = `👀 see all ${totalAll} results`;
    seeMoreBtn.onclick = () => {
      renderLeaderboard(9999);
      seeMoreBtn.textContent = '🔼 show less';
      seeMoreBtn.onclick = () => renderLeaderboard(10);
    };
  } else {
    seeMoreBtn.style.display = 'none';
  }

  renderMyComboPanel();
};

// =========================================================
// ⭐❤️  PER-USER STARS / HEARTS TOTALS (for leaderboard sort)
// =========================================================

const userStarsCache  = {};
const userHeartsCache = {};

onValue(ref(db, 'userStars'), snap => {
  const d = snap.val() || {};
  Object.keys(userStarsCache).forEach(k => delete userStarsCache[k]);
  Object.assign(userStarsCache, d);
  renderLeaderboard();
});
onValue(ref(db, 'userHearts'), snap => {
  const d = snap.val() || {};
  Object.keys(userHeartsCache).forEach(k => delete userHeartsCache[k]);
  Object.assign(userHeartsCache, d);
  renderLeaderboard();
});

// 4th wrap layer: also bump the user's personal star/heart counter
const _origRate_v4  = window.rateService;
const _origHeart_v4 = window.heartService;
window.rateService = function(id, btn) {
  _origRate_v4(id, btn);
  if (currentUID) runTransaction(ref(db, 'userStars/'  + currentUID), v => (v || 0) + 1).catch(() => {});
};
window.heartService = function(id, btn) {
  _origHeart_v4(id, btn);
  if (currentUID) runTransaction(ref(db, 'userHearts/' + currentUID), v => (v || 0) + 1).catch(() => {});
};

// extend renderLeaderboard with stars/hearts modes (5th-layer wrap)
const _origRenderLeaderboard_v4 = renderLeaderboard;
renderLeaderboard = function(limit = 10) {
  const mode = leaderboardSort;
  if (mode !== 'stars' && mode !== 'hearts') {
    return _origRenderLeaderboard_v4(limit);
  }
  const list = document.getElementById('leaderboardList');
  if (!list) return;

  const all = getUserLeaderboard(100);
  all.forEach(u => {
    u.combos    = (u.uid && userCombosCache[u.uid])     || 0;
    u.gameScore = (u.uid && userGameScoresCache[u.uid]) || 0;
    u.starsGiven  = (u.uid && userStarsCache[u.uid])    || 0;
    u.heartsGiven = (u.uid && userHeartsCache[u.uid])   || 0;
  });

  const valueOf    = mode === 'stars' ? u => u.starsGiven  : u => u.heartsGiven;
  const valueLabel = mode === 'stars' ? u => `⭐ ${u.starsGiven.toLocaleString()}` : u => `❤️ ${u.heartsGiven.toLocaleString()}`;
  const emptyMsg   = mode === 'stars' ? 'no one\'s rated yet ⭐ tap the stars!' : 'no hearts given yet 💔 spread the love!';
  const sorted = all.filter(u => valueOf(u) > 0).sort((a, b) => valueOf(b) - valueOf(a)).slice(0, limit);

  if (!sorted.length) {
    list.innerHTML = `<p class="loading-text" style="text-align:center;opacity:.6">${emptyMsg}</p>`;
    renderMyComboPanel();
    return;
  }

  const max = valueOf(sorted[0]) || 1;
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  list.innerHTML = sorted.map((u, i) => {
    const v = valueOf(u);
    const pct = Math.round((v / max) * 100);
    const isMe = u.uid === currentUID;
    const isDevUser = isAdmin(u.uid);
    const safe = escapeHtml(u.name);
    const comboHTML = renderComboBadgeHTML(u.combos);
    const meta = [
      u.starsGiven  ? `⭐ ${u.starsGiven.toLocaleString()}`  : null,
      u.heartsGiven ? `❤️ ${u.heartsGiven.toLocaleString()}` : null,
      `▲ ${u.upvotes}`,
      `📩 ${u.msgs}`,
      u.combos    ? `🎖 ${u.combos.toLocaleString()}`    : null,
      u.gameScore ? `🎮 ${u.gameScore.toLocaleString()}` : null,
    ].filter(Boolean).join(' · ');

    return `
      <div class="lb-row lb-${i+1} ${isMe ? 'lb-me' : ''}" data-lb-key="${u.uid || u.name}">
        <div class="lb-medal">${medals[i] || '✨'}</div>
        <div class="lb-name">
          ${safe}${isDevUser ? ' <span class="admin-crown">👑</span>' : ''}${isMe ? ' <span style="opacity:.6;font-weight:600">(you)</span>' : ''}
          <div class="lb-meta">${meta}</div>
          ${comboHTML ? `<div class="lb-badges">${comboHTML}</div>` : ''}
        </div>
        <div class="lb-score">${valueLabel(u)}</div>
        <div class="lb-bar"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join('');

  renderMyComboPanel();
};

// extend the sort-label updater to handle all modes
const _origSetSort_v4 = window.setLeaderboardSort;
window.setLeaderboardSort = function(mode) {
  _origSetSort_v4(mode);
  const LABELS = {
    stars:       '— Most Stars Given',
    hearts:      '— Most Hearts Given',
    upvotes:     '— Most Upvotes',
    reactions:   '— Most Reactions',
    starshearts: '— Overall (Stars + Hearts)',
    combos:      '— Highest Combos',
    game:        '— Highest Game Points',
    overall:     '— Best Overall',
  };
  const lbl = document.getElementById('lbSortLabel');
  if (lbl && LABELS[mode]) lbl.textContent = LABELS[mode];
};

// =========================================================
// 🏆 LEADERBOARD — 3 new user-requested modes
//   'upvotes'     → most message upvotes
//   'reactions'   → most message reactions (combined)
//   'starshearts' → stars given + hearts given (service)
// =========================================================
const _origRenderLeaderboard_v5 = renderLeaderboard;
renderLeaderboard = function(limit = 10) {
  const mode = leaderboardSort;
  if (mode !== 'upvotes' && mode !== 'reactions' && mode !== 'starshearts') {
    return _origRenderLeaderboard_v5(limit);
  }
  const list = document.getElementById('leaderboardList');
  if (!list) return;

  const all = getUserLeaderboard(100);
  all.forEach(u => {
    u.combos      = (u.uid && userCombosCache[u.uid])    || 0;
    u.gameScore   = (u.uid && userGameScoresCache[u.uid])|| 0;
    u.starsGiven  = (u.uid && userStarsCache[u.uid])     || 0;
    u.heartsGiven = (u.uid && userHeartsCache[u.uid])    || 0;
  });

  let valueOf, valueLabel, emptyMsg, sorted;
  if (mode === 'upvotes') {
    valueOf    = u => u.upvotes;
    valueLabel = u => `▲ ${u.upvotes.toLocaleString()}`;
    emptyMsg   = 'no upvotes yet — send messages and get rated! ▲';
    sorted     = all.filter(u => u.upvotes > 0).sort((a,b) => b.upvotes - a.upvotes).slice(0, limit);
  } else if (mode === 'reactions') {
    valueOf    = u => u.reactions;
    valueLabel = u => `💬 ${u.reactions.toLocaleString()}`;
    emptyMsg   = 'no message reactions yet 💀 send a message!';
    sorted     = all.filter(u => u.reactions > 0).sort((a,b) => b.reactions - a.reactions).slice(0, limit);
  } else {
    // starshearts — service ⭐ + ❤️
    valueOf    = u => (u.starsGiven + u.heartsGiven);
    valueLabel = u => `⭐${u.starsGiven} ❤️${u.heartsGiven}`;
    emptyMsg   = 'no stars or hearts given yet — rate the services! ⭐❤️';
    sorted     = all.filter(u => valueOf(u) > 0).sort((a,b) => valueOf(b) - valueOf(a)).slice(0, limit);
  }

  if (!sorted.length) {
    list.innerHTML = `<p class="loading-text" style="text-align:center;opacity:.6">${emptyMsg}</p>`;
    renderMyComboPanel();
    return;
  }

  const max    = valueOf(sorted[0]) || 1;
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  list.innerHTML = sorted.map((u, i) => {
    const v = valueOf(u);
    const pct = Math.round((v / max) * 100);
    const isMe      = u.uid === currentUID;
    const isDevUser = isAdmin(u.uid);
    const safe      = escapeHtml(u.name);
    const comboHTML = renderComboBadgeHTML(u.combos);
    const meta = [
      `▲ ${u.upvotes}`, `💬 ${u.reactions}`, `📩 ${u.msgs}`,
      u.starsGiven  ? `⭐ ${u.starsGiven}`  : null,
      u.heartsGiven ? `❤️ ${u.heartsGiven}` : null,
    ].filter(Boolean).join(' · ');
    return `
      <div class="lb-row lb-${i+1} ${isMe ? 'lb-me' : ''}" data-lb-key="${u.uid || u.name}">
        <div class="lb-medal">${medals[i] || '✨'}</div>
        <div class="lb-name">
          ${safe}${isDevUser ? ' <span class="admin-crown">👑</span>' : ''}${isMe ? ' <span style="opacity:.6;font-weight:600">(you)</span>' : ''}
          <div class="lb-meta">${meta}</div>
          ${comboHTML ? `<div class="lb-badges">${comboHTML}</div>` : ''}
        </div>
        <div class="lb-score">${valueLabel(u)}</div>
        <div class="lb-bar"><span style="width:${pct}%"></span></div>
      </div>`;
  }).join('');

  renderMyComboPanel();
};

// =========================================================
// 🔌 EXPOSE FIREBASE TO PLUGIN SCRIPTS (window._natDB)
// non-module helper for tabs/photo wall/map/guestbook/etc
// =========================================================
window._natDB = {
  db, ref, onValue, push, set, remove, runTransaction, get,
  ADMIN_UID,
  getUID:          () => currentUID,
  isAdmin:         (uid) => isAdmin(uid ?? currentUID),
  isAdminNow:      () => isAdminNow(),
  getAdminWriteUID: () => {
    const fbUser = auth.currentUser;
    if (fbUser && (fbUser.uid === ADMIN_UID || fbUser.uid === OLD_ADMIN_UID || fbUser.uid === OLD_ADMIN_UID2)) return fbUser.uid;
    if (fbUser?.email && ADMIN_EMAILS.some(e => fbUser.email.toLowerCase() === e.toLowerCase())) return fbUser.uid;
    return ADMIN_UID;
  },
};

// Expose badges API for profile.js
window.__badgesAPI = {
  getBadgeById,
  getEarned: () => {
    try {
      const base = [...getEarnedBadges(userGifReactions, userArtistReacts, userMsgCount, userRoleBadges)];
      // Add ascended badges based on lifetime combo total
      const total = myComboTotal || 0;
      (ASCENDED_THRESHOLDS || []).forEach(({ id, min }) => {
        if (total >= min && !base.includes(id)) base.push(id);
      });
      // Also add champion/VIP badges that may have been granted via Firebase
      (window.__extraBadges || []).forEach(id => {
        if (!base.includes(id)) base.push(id);
      });
      return base;
    } catch { return []; }
  },
};

function getPlateFromLevel(level) {
  const plates = window.PLATES || [
    { id: 'paper', unlock: 1 },
    { id: 'pastel', unlock: 10 },
    { id: 'sunset', unlock: 20 },
    { id: 'aqua', unlock: 30 },
    { id: 'cherry', unlock: 40 },
    { id: 'galaxy', unlock: 50 },
    { id: 'gold', unlock: 60 },
    { id: 'inferno', unlock: 70 },
    { id: 'aurora', unlock: 80 },
    { id: 'celestial', unlock: 90 },
    { id: 'mythic', unlock: 99 },
  ];
  
  let current = 'paper';
  
  for (const p of plates) {
    if (level >= p.unlock) current = p.id;
  }
  
  return current;
}

window.getPlateFromLevel = getPlateFromLevel;

// 🆕 v2 INTEGRATIONS — mod indicators, plates, level chip, VIP, criticals, EXP
// =========================================================
(() => {
  // ---- profile cache for OTHER users (so we can show their plate / level / pfp) ----
  window.profileCache = window.profileCache || {};
  const profileCache = window.profileCache;
  function listenAllProfiles() {
    onValue(ref(db, 'userProfiles'), snap => {
      const data = snap.val() || {};
      Object.keys(profileCache).forEach(k => delete profileCache[k]);
      Object.keys(data).forEach(uid => {
        profileCache[uid] = {
          ...data[uid],
          earnedBadges: data[uid]?.earnedBadges || []
        };
      });

      // 🔥 AUTO UPDATE PLATE BASED ON LEVEL
      if (window.currentUID && profileCache[window.currentUID]) {
        const level = profileCache[window.currentUID].level || 0;
        const correctPlate = getPlateFromLevel(level);
        if (profileCache[window.currentUID].plate !== correctPlate) {
          set(ref(db, 'userProfiles/' + window.currentUID + '/plate'), correctPlate);
        }
      }

      renderMessages();
    });
  }
  setTimeout(listenAllProfiles, 800);

  // ---- VIP map cache (mirror of vip.js) ----
  function isVIP(uid) { return !!(window.getVipMap && window.getVipMap()[uid]); }
  window.addEventListener('vip-update', () => decorateMessages());

  // ---- mod react indicator + plates + level chip + VIP badge ----
  const _origRender = window.renderMessages || renderMessages;
  function decorateMessages() {
    document.querySelectorAll('.message-bubble').forEach(bubble => {
      // find the msg key from any inner button
      const key = bubble.querySelector('[data-msg-key]')?.dataset?.msgKey
               || bubble.querySelector('.delete-btn')?.dataset?.key;
      if (!key) return;
      
// Skip old decorators for prestige messages
// Prestige messages are fully handled elsewhere
if (bubble.classList.contains('prestige-user')) {

  // FIX MYTHIC PLATE
  const _mForPlate = (() => {
    try {
      return (allMessages || []).find(x => x._key === key);
    } catch {
      return null;
    }
  })();

  const _uidForPlate = _mForPlate?.uid;

  if (_uidForPlate) {

    const _plate = profileCache[_uidForPlate]?.plate;

    bubble.className = bubble.className
      .replace(/\bplate-[a-z0-9]+\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (_plate && _plate !== 'paper') {
      bubble.classList.add('plate-' + _plate);
    }
  }

  // PRESTIGE LAYOUT
  if (
    window.applyPrestigeLayout &&
    !bubble.dataset.prestigeApplied &&
    bubble.dataset.prestigeLoaded !== '1'
  ) {

    bubble.dataset.prestigeApplied = '1';

    try {

      window.applyPrestigeLayout(bubble);

    } catch(e) {

      console.error('prestige apply fail', e);

    }

  }

  return;
}

      // attach msg-uid lookup using allMessages if available
      let m = null;
      try { m = (allMessages || []).find(x => x._key === key); } catch {}
      const uid = m?.uid;
      // Enable prestige layout
if (uid) {
  bubble.classList.add('prestige-user');
}

      // === plate ===
      const plate = uid && profileCache[uid]?.plate;
      // strip any old plate-* class
      bubble.className = bubble.className.replace(/\bplate-[a-z0-9]+\b/g, '').replace(/\s{2,}/g, ' ').trim();
      if (plate && plate !== 'paper') bubble.classList.add('plate-' + plate);
// ── PRESTIGE USER ENABLE ──
if (uid && profileCache?.[uid]) {
  const prof = profileCache[uid];

  const level = prof.level || 0;
  const hasFrame = !!prof.equippedFrame;
  const hasTitle = !!prof.equippedTitle;

  if (
    level >= 1 ||
    hasFrame ||
    hasTitle ||
    isVIP(uid)
  ) {
    bubble.classList.add('prestige-user');
  }
}
// ── Remove any leftover old level/vip chips (they are now handled by the prestige system) ──
const meta = bubble.querySelector('.msg-meta');
if (meta) {
  meta.querySelectorAll('.lvl-chip,.vip-chip').forEach(x => x.remove());
}

      // === mod-react indicator (subscribe once) ===
      if (!bubble.dataset._modSub) {
        bubble.dataset._modSub = '1';
        onValue(ref(db, `messages/${key}/specialReacts`), snap => {
          const data = snap.val() || {};
          let cur = bubble.querySelector('.mod-react-indicator');
          const ids = Object.entries(data);
          if (!ids.length) { cur?.remove(); return; }
          const html = ids.map(([uidR, info]) => {
            const tag = (info && info.role === 'dev') ? 'DEV' : 'MOD';
            const emoji = (info && info.emoji) || '⭐';
            return `<span class="mr-chip"><b>★ ${tag}</b> reacted ${emoji}</span>`;
          }).join('');
          if (cur) cur.innerHTML = html;
          else {
            cur = document.createElement('div');
            cur.className = 'mod-react-indicator';
            cur.innerHTML = html;
            bubble.insertBefore(cur, bubble.firstChild);
          }
        });
      }
    });
  }

  if (typeof renderMessages === 'function') {
    const _prev = renderMessages;
    renderMessages = function() {
      const r = _prev.apply(this, arguments);
      requestAnimationFrame(decorateMessages);
      return r;
    };
    try { window.renderMessages = renderMessages; } catch {}
  }

  // ---- toggleMsgReaction wrap: special react write + EXP + diamond FX ----
  if (typeof toggleMsgReaction === 'function') {
    const _origToggle = toggleMsgReaction;
    toggleMsgReaction = function(msgKey, emoji, btn) {
      _origToggle.call(this, msgKey, emoji, btn);
      // EXP for reacting
      try { window.addExp?.(2, 'message react'); } catch {}
      try { window.bumpQuest?.('tap', 1); } catch {}
      // VIP / mod special react
      const isMod = isAdmin(currentUID) || (userRoleBadges && userRoleBadges.includes('role_mod'));
      const isDev = userRoleBadges && userRoleBadges.includes('role_dev');
      if (currentUID && (isMod || isDev || isVIP(currentUID))) {
        const role = isDev ? 'dev' : (isMod ? 'mod' : 'vip');
        const isOn = !!(userMsgReacts[msgKey] && userMsgReacts[msgKey][emoji]);
        if (isOn) {
          set(ref(db, `messages/${msgKey}/specialReacts/${currentUID}`), { emoji, role, ts: Date.now() }).catch(()=>{});
        } else {
          remove(ref(db, `messages/${msgKey}/specialReacts/${currentUID}`)).catch(()=>{});
        }
        if (isVIP(currentUID) && window.diamondDropFX) window.diamondDropFX();
      }
    };
    try { window.toggleMsgReaction = toggleMsgReaction; } catch {}
  }

  // ---- bumpCombo wrap: critical x10 / x20 screen FX ----
  if (typeof bumpCombo === 'function') {
    const _origBump = bumpCombo;
    bumpCombo = function(id, btn, type) {
      _origBump.call(this, id, btn, type);
      const c = comboState[id];
      if (!c) return;
      // tap exp
      try { window.addExp?.(1, 'service tap'); } catch {}
      try { window.bumpQuest?.('tap', 1); } catch {}
      try { window.bumpQuest?.('combo', 1); } catch {}
      if (c.count === 10) { triggerCriticalFX(10); window.bumpQuest?.('crit10', 1); }
      else if (c.count === 20) triggerCriticalFX(20);
      else if (c.count > 20 && c.count % 10 === 0) triggerCriticalFX(c.count);
    };
  }

  function triggerCriticalFX(n) {
    const tier = n >= 20 ? 'mega' : 'crit';
    const chip = document.createElement('div');
    chip.className = 'crit-chip crit-chip-' + tier;
    chip.innerHTML = (tier === 'mega' ? '🔥 MEGA CRIT' : '⚡ CRITICAL') + ' <b>×' + n + '</b>';
    document.body.appendChild(chip);
    requestAnimationFrame(() => requestAnimationFrame(() => chip.classList.add('crit-chip-show')));
    if (tier === 'mega' && window.SFX?.specialReact) try { SFX.specialReact('🔥'); } catch {}
    setTimeout(() => {
      chip.classList.remove('crit-chip-show');
      setTimeout(() => chip.remove(), 350);
    }, 1500);
  }

  // ---- sendMessage wrap: EXP + quest bump on success ----
  if (typeof sendMessage === 'function') {
    const _origSend = sendMessage;
    sendMessage = async function() {
      const input = document.getElementById('msgInput');
      const had = input && input.value.trim().length > 0;
      const r = await _origSend.apply(this, arguments);
      // success heuristic: input was non-empty before, empty after
      if (had && input && input.value.trim() === '') {
        try { window.addExp?.(15, 'message'); } catch {}
        try { window.bumpQuest?.('msg', 1); } catch {}
      }
      return r;
    };
    try { window.sendMessage = sendMessage; } catch {}
  }
})();
// =========================================================
// 🌱 ADMIN-ONLY LEADERBOARD SEEDS
// Writes directly to YOUR OWN uid's Firebase path so you appear
// in whichever leaderboard category you seed.
// Usage:  _seedMyStars(500)   _seedMyHearts(300)
//         _seedMyCombos(99999) _seedMyGameScore(9999)
//         _clearMySeeds()  ← wipes all 4
// =========================================================
window._seedMyStars = function(n = 500) {
  const db = window._natDB;
  if (!db?.isAdminNow?.()) return _lbSeedLog('admin only 🔐', 'error');
  const uid = db.getUID();
  return db.set(db.ref(db.db, 'userStars/' + uid), Number(n))
    .then(() => _lbSeedLog('✅ userStars set to ' + n + ' for your UID'))
    .catch(e => _lbSeedLog('error: ' + e.message, 'error'));
};
window._seedMyHearts = function(n = 300) {
  const db = window._natDB;
  if (!db?.isAdminNow?.()) return _lbSeedLog('admin only 🔐', 'error');
  const uid = db.getUID();
  return db.set(db.ref(db.db, 'userHearts/' + uid), Number(n))
    .then(() => _lbSeedLog('✅ userHearts set to ' + n + ' for your UID'))
    .catch(e => _lbSeedLog('error: ' + e.message, 'error'));
};
window._seedMyCombos = function(n = 99999) {
  const db = window._natDB;
  if (!db?.isAdminNow?.()) return _lbSeedLog('admin only 🔐', 'error');
  const uid = db.getUID();
  return db.set(db.ref(db.db, 'userCombos/' + uid), Number(n))
    .then(() => {
      _lbSeedLog('✅ userCombos set to ' + n + ' for your UID');
      // Also update local counter so badge UI reflects it immediately
      try { myComboTotal = Number(n); localStorage.setItem('natnat_my_combo_total', String(n)); } catch {}
    })
    .catch(e => _lbSeedLog('error: ' + e.message, 'error'));
};
window._seedMyGameScore = function(n = 9999) {
  const db = window._natDB;
  if (!db?.isAdminNow?.()) return _lbSeedLog('admin only 🔐', 'error');
  const uid = db.getUID();
  return db.set(db.ref(db.db, 'userGameScores/' + uid), Number(n))
    .then(() => _lbSeedLog('✅ userGameScores set to ' + n + ' for your UID'))
    .catch(e => _lbSeedLog('error: ' + e.message, 'error'));
};
window._clearMySeeds = function() {
  const db = window._natDB;
  if (!db?.isAdminNow?.()) return _lbSeedLog('admin only 🔐', 'error');
  const uid = db.getUID();
  return Promise.all([
    db.set(db.ref(db.db, 'userStars/'      + uid), null),
    db.set(db.ref(db.db, 'userHearts/'     + uid), null),
    db.set(db.ref(db.db, 'userCombos/'     + uid), null),
    db.set(db.ref(db.db, 'userGameScores/' + uid), null),
  ]).then(() => _lbSeedLog('✅ all leaderboard seeds cleared for your UID'))
    .catch(e => _lbSeedLog('error: ' + e.message, 'error'));
};
function _lbSeedLog(msg, level) {
  if (window._natConsoleLog) { window._natConsoleLog(msg, level); return; }
  if (level === 'error') console.error('[seed]', msg);
  else console.log('[seed]', msg);
}
// badge popup system
document.addEventListener('click', (e) => {

  const btn = e.target.closest('.badge-more-indicator');
  if (!btn) return;

  // remove existing popup
  document.querySelectorAll('.badge-popup').forEach(p => p.remove());

  const raw = btn.dataset.allBadges;
  if (!raw) return;

  const popup = document.createElement('div');
  popup.className = 'badge-popup';

  popup.innerHTML = decodeURIComponent(raw);

  document.body.appendChild(popup);

  const rect = btn.getBoundingClientRect();

  popup.style.left = `${Math.max(12, rect.left - 120)}px`;
  popup.style.top = `${rect.bottom + 10}px`;

  // close when clicking outside
  setTimeout(() => {
    const closePopup = (ev) => {
      if (!popup.contains(ev.target) &&
          !ev.target.closest('.badge-more-indicator')) {

        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    };

    document.addEventListener('click', closePopup);
  }, 50);

});