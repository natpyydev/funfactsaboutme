/* 🌍 VISITOR COUNTER
   Records a unique visit per device in Firebase at visitors/$uid
   Displays live visitor count in #visitorCounter element
*/
(function () {
  function recordVisit(db) {
    const uid = db.getUID();
    if (!uid) return;
    const storageKey = 'nat-visited-' + uid.slice(0, 10);
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
    db.set(db.ref(db.db, 'visitors/' + uid), Date.now()).catch(function () {});
  }

  function showCounter(count) {
    const el = document.getElementById('visitorCounter');
    if (!el) return;
    el.textContent = '👁 ' + count.toLocaleString() + (count === 1 ? ' visitor' : ' visitors');
    el.style.opacity = '1';
  }

  function listenCount(db) {
    var realCount = 0;
    var seedCount = 0;

    db.onValue(db.ref(db.db, 'visitors'), function (snap) {
      realCount = Object.keys(snap.val() || {}).length;
      showCounter(realCount + seedCount);
    });

    // Read the seed from the canonical ADMIN_UID path.
    // adminData is now publicly readable so ALL visitors see the seeded total.
    db.onValue(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/visitorSeedCount'), function (snap) {
      seedCount = snap.val() || 0;
      showCounter(realCount + seedCount);
    });
  }

  function init() {
    var tries = 0;
    var id = setInterval(function () {
      tries++;
      const db = window._natDB;
      if (db || tries > 60) {
        clearInterval(id);
        if (!db) return;
        recordVisit(db);
        listenCount(db);
      }
    }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 🌱 Admin-only: set the displayed visitor seed count.
  // Always writes to adminData/{ADMIN_UID}/visitorSeedCount — the same path
  // the listener reads from — so the counter updates live for ALL visitors.
  // Usage: window._seedVisitors()        → default +200
  //        window._seedVisitors(500)     → set to exactly 500
  window._seedVisitors = function(count) {
    var db = window._natDB;
    if (!db) { _natLog('DB not ready — try again', 'warn'); return; }
    if (!db.isAdminNow || !db.isAdminNow()) { _natLog('admin only 🔐  UID: ' + db.getUID(), 'error'); return; }
    count = (typeof count === 'number') ? count : 200;
    return db.set(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/visitorSeedCount'), count)
      .then(function() { _natLog('✅ visitorSeedCount → +' + count + ' (all visitors will now see this)'); return count; })
      .catch(function(e) { _natLog('Firebase error: ' + e.message, 'error'); throw e; });
  };

  function _natLog(msg, level) {
    if (window._natConsoleLog) { window._natConsoleLog(msg, level); return; }
    if (level === 'error') console.error('[_seedVisitors]', msg);
    else if (level === 'warn') console.warn('[_seedVisitors]', msg);
    else console.log('[_seedVisitors]', msg);
  }
})();
