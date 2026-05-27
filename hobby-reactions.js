// ================================================================
// ❤️ HOBBY REACTIONS — Firebase-synced counts, per-user state in Firebase
// ================================================================

const EMOJIS = ['❤️', '😍', '😆', '😭'];
const LOCAL_MY_KEY = 'natnat_hobby_reacted';

function getMyReacts() {
  try { return JSON.parse(localStorage.getItem(LOCAL_MY_KEY) || '{}'); } catch { return {}; }
}
function setMyReact(hobbyId, emoji) {
  const r = getMyReacts();
  if (emoji) r[hobbyId] = emoji; else delete r[hobbyId];
  localStorage.setItem(LOCAL_MY_KEY, JSON.stringify(r));
}

let _fbCounts   = {};  // hobbyId -> { emoji -> count }  (from Firebase hobbyReactions)
let _hobbySeeds = {};  // hobbyId -> { emoji -> seedCount } (from adminData seeds)

function updateBarUI(bar, hobbyId) {
  const fbData = _fbCounts[hobbyId]   || {};
  const seeds  = _hobbySeeds[hobbyId] || {};
  const mine   = getMyReacts()[hobbyId];
  EMOJIS.forEach(em => {
    const span  = bar.querySelector(`[data-emoji="${em}"] .hreact-count`);
    const total = (fbData[em] || 0) + (seeds[em] || 0);
    if (span) span.textContent = total > 0 ? total : '';
  });
  bar.querySelectorAll('.hreact-btn').forEach(b => {
    b.classList.toggle('hreact-active', b.dataset.emoji === mine);
  });
}

function buildBar(card) {
  const hobbyId = card.dataset.hobby;
  if (!hobbyId) return;

  const bar = document.createElement('div');
  bar.className = 'hobby-reactions';
  bar.dataset.hobby = hobbyId;

  EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.className = 'hreact-btn';
    btn.dataset.emoji = em;
    btn.innerHTML = `${em} <span class="hreact-count"></span>`;
    btn.addEventListener('click', () => handleReact(hobbyId, em));
    bar.appendChild(btn);
  });

  const body = card.querySelector('.hobby-body');
  if (!body) return;
  const anchor = body.querySelector('.hobby-book-btn, .hobby-action-row, .service-btn');
  if (anchor) body.insertBefore(bar, anchor);
  else body.appendChild(bar);

  updateBarUI(bar, hobbyId);
}

function handleReact(hobbyId, emoji) {
  const my = getMyReacts()[hobbyId];

  // Optimistic local state update (just for "mine" highlight — counts come from Firebase)
  if (my === emoji) {
    setMyReact(hobbyId, null);
  } else {
    setMyReact(hobbyId, emoji);
  }
  const bar = document.querySelector(`.hobby-reactions[data-hobby="${hobbyId}"]`);
  if (bar) updateBarUI(bar, hobbyId);

  // Firebase sync — counts are authoritative server-side
  const db = window._natDB;
  if (!db) return;
  const uid = db.getUID();
  if (!uid) return;

  if (my === emoji) {
    // un-react
    db.runTransaction(db.ref(db.db, `hobbyReactions/${hobbyId}/${emoji}`), v => Math.max(0, (v || 0) - 1));
    db.remove(db.ref(db.db, `hobbyReactionsMy/${uid}/${hobbyId}`)).catch(() => {});
  } else {
    // switch/add react
    if (my) db.runTransaction(db.ref(db.db, `hobbyReactions/${hobbyId}/${my}`), v => Math.max(0, (v || 0) - 1));
    db.runTransaction(db.ref(db.db, `hobbyReactions/${hobbyId}/${emoji}`), v => (v || 0) + 1);
    db.set(db.ref(db.db, `hobbyReactionsMy/${uid}/${hobbyId}`), emoji).catch(() => {});
  }
}

function listenHobbyFirebase(db) {
  // Live aggregate counts from Firebase
  db.onValue(db.ref(db.db, 'hobbyReactions'), snap => {
    _fbCounts = snap.val() || {};
    document.querySelectorAll('.hobby-reactions[data-hobby]').forEach(bar => {
      updateBarUI(bar, bar.dataset.hobby);
    });
  });

  // Per-user "which emoji did I react with" — stored in Firebase, not just localStorage
  const uid = db.getUID();
  if (uid) {
    db.onValue(db.ref(db.db, `hobbyReactionsMy/${uid}`), snap => {
      const data = snap.val() || {};
      Object.entries(data).forEach(([hobbyId, emoji]) => {
        setMyReact(hobbyId, emoji);
        const bar = document.querySelector(`.hobby-reactions[data-hobby="${hobbyId}"]`);
        if (bar) updateBarUI(bar, hobbyId);
      });
    });
  }

  // Admin-seeded counts — stored at adminData/{ADMIN_UID}/hobbySeeds
  // adminData is publicly readable so ALL users see the seeded counts
  db.onValue(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/hobbySeeds'), snap => {
    _hobbySeeds = snap.val() || {};
    document.querySelectorAll('.hobby-reactions[data-hobby]').forEach(bar => {
      updateBarUI(bar, bar.dataset.hobby);
    });
  });
}

function waitForDB() {
  const db = window._natDB;
  if (db && db.getUID()) {
    listenHobbyFirebase(db);
  } else {
    setTimeout(waitForDB, 300);
  }
}

export function initHobbyReactions() {
  document.querySelectorAll('.hobby-card[data-hobby]').forEach(buildBar);
  waitForDB();
}

// 🌱 Admin-only: seed fake reaction counts for hobby cards.
// Stored at adminData/{ADMIN_UID}/hobbySeeds — publicly readable, admin-only write.
// These are ADDED on top of real Firebase counts (no fake UIDs, no cheating the rules).
//
// Usage:
//   window._seedHobbyReactions()
//     → seeds all known hobbies with default counts
//   window._seedHobbyReactions({ coding: { '❤️': 120, '😍': 80 } })
//     → seeds custom values for specific hobbies
//   window._seedHobbyReactions({}, true)
//     → clears all hobby seeds
window._seedHobbyReactions = function(customSeeds, clear) {
  var db = window._natDB;
  if (!db) { _natLog('DB not ready — try again', 'warn'); return; }
  if (!db.isAdminNow || !db.isAdminNow()) { _natLog('admin only 🔐  UID: ' + db.getUID(), 'error'); return; }

  if (clear) {
    return db.set(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/hobbySeeds'), null)
      .then(function() { _natLog('✅ hobby reaction seeds cleared'); })
      .catch(function(e) { _natLog('Firebase error: ' + e.message, 'error'); throw e; });
  }

  // Default seeds — covers common hobby IDs used on the page
  var seeds = customSeeds && Object.keys(customSeeds).length ? customSeeds : {
    photo:   { '❤️': 143, '😍': 97,  '😆': 33, '😭': 14 },  // Photography
    coding:  { '❤️': 147, '😍': 94,  '😆': 23, '😭': 12 },  // Coding
    watch:   { '❤️': 178, '😍': 121, '😆': 52, '😭': 28 },  // Watch History
    sports:  { '❤️': 134, '😍': 89,  '😆': 67, '😭': 15 },  // Sports
    digiart: { '❤️': 96,  '😍': 72,  '😆': 18, '😭': 9  },  // Digital Arts
    cinema:  { '❤️': 211, '😍': 138, '😆': 44, '😭': 31 },  // Cinematographer
    video:   { '❤️': 183, '😍': 115, '😆': 38, '😭': 22 },  // Videographer
    editor:  { '❤️': 112, '😍': 68,  '😆': 21, '😭': 11 },  // Photo/Video Editor
    music:   { '❤️': 256, '😍': 172, '😆': 88, '😭': 41 },  // Instruments/Music
    games:   { '❤️': 189, '😍': 133, '😆': 77, '😭': 35 },  // Games
  };

  return db.set(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/hobbySeeds'), seeds)
    .then(function() {
      var total = Object.keys(seeds).length;
      _natLog('✅ hobby reaction seeds set for ' + total + ' hobbies — visible to all users live');
      return seeds;
    })
    .catch(function(e) { _natLog('Firebase error: ' + e.message, 'error'); throw e; });
};

function _natLog(msg, level) {
  if (window._natConsoleLog) { window._natConsoleLog(msg, level); return; }
  if (level === 'error') console.error('[_seedHobbyReactions]', msg);
  else if (level === 'warn') console.warn('[_seedHobbyReactions]', msg);
  else console.log('[_seedHobbyReactions]', msg);
}
