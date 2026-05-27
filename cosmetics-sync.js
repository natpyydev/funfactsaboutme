/* ============================================================
   COSMETICS SYNC — cosmetics-sync.js
   Phase 1: Firebase Firestore Persistence Layer

   PURPOSE:
     Gives _natFrames full cloud persistence so equippedFrame,
     ownedFrames, badges, title, and levelStyle survive:
       • page refresh
       • logout / login
       • Google sign-in

   DEPENDS ON (must already be on window before this runs):
     window._natFirebase  → { app, db, auth, ... }   (set by app.js)
     window._natFrames    → full frame engine API     (set by avatar-frames.js)
     window.currentUID    → string | null             (set by app.js auth cb)

   LOAD ORDER in index.html:
     1. app.js            (type="module", sets _natFirebase + auth)
     2. avatar-frames.js  (defer, sets _natFrames)
     3. cosmetics-sync.js (defer, THIS FILE — patches _natFrames)

   FIRESTORE PATH:
     users/{uid}/cosmetics/profile
     {
       equippedFrame : "developer" | null,
       ownedFrames   : { developer: true, vip_space: true, … },
       equippedBadges: ["dev","vip"],
       equippedTitle : "Architect",
       levelStyle    : "mythic",
       updatedAt     : serverTimestamp()
     }

   PUBLIC API ADDITIONS (patched onto window._natFrames):
     window._natFrames.syncFromCloud()  → Promise<void>
     window._natFrames.saveToCloud()    → Promise<void>
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONSTANTS
  ---------------------------------------------------------- */
  const COLLECTION = 'users';
  const DOC_PATH   = 'cosmetics/profile';     // subcollection/doc inside uid
  const LOG        = '[cosmeticsSync]';
  const SAVE_DEBOUNCE_MS = 800;               // batch rapid writes

  /* ----------------------------------------------------------
     MODULE STATE
  ---------------------------------------------------------- */
  let _fsDb         = null;   // Firestore instance
  let _fsLib        = null;   // { doc, getDoc, setDoc, serverTimestamp }
  let _unsubAuth    = null;   // unsubscribe fn from onAuthStateChanged
  let _saveTimer    = null;   // debounce timer for saveToCloud
  let _localCache   = null;   // last-read cosmetics data (plain object)
  let _currentUID   = null;   // uid this module is scoped to
  let _patched      = false;  // have we wrapped equip/grant yet?
  let _initAttempts = 0;
  const MAX_INIT    = 80;     // 8 s @ 100 ms

  /* ----------------------------------------------------------
     1. FIRESTORE BOOTSTRAP
        Load Firestore SDK lazily so we never block app.js.
        app.js only imports RTDB; we self-import Firestore here.
  ---------------------------------------------------------- */
  async function _loadFirestore() {
    if (_fsLib) return true;

    try {
      const { getFirestore, doc, getDoc, setDoc, serverTimestamp } =
        await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      if (!window._natFirebase?.app) {
        console.warn(LOG, 'Firebase app not ready');
        return false;
      }

      _fsDb  = getFirestore(window._natFirebase.app);
      _fsLib = { doc, getDoc, setDoc, serverTimestamp };
      console.log(LOG, '✅ Firestore loaded');
      return true;
    } catch (e) {
      console.error(LOG, 'Failed to load Firestore SDK:', e);
      return false;
    }
  }

  /* ----------------------------------------------------------
     2. FIRESTORE DOCUMENT REFERENCE HELPER
  ---------------------------------------------------------- */
  function _profileRef(uid) {
    // users/{uid}/cosmetics/profile
    return _fsLib.doc(_fsDb, COLLECTION, uid, 'cosmetics', 'profile');
  }

  /* ----------------------------------------------------------
     3. syncFromCloud()
        Read Firestore → restore equipped frame + owned inventory.
        Safe to call multiple times; caches result.
  ---------------------------------------------------------- */
  async function syncFromCloud(uid) {
    uid = uid || _currentUID || window.currentUID;
    if (!uid) { console.warn(LOG, 'syncFromCloud: no uid'); return; }

    const fsReady = await _loadFirestore();
    if (!fsReady) return;

    try {
      const snap = await _fsLib.getDoc(_profileRef(uid));

      if (!snap.exists()) {
        console.log(LOG, 'No cosmetics doc for', uid, '— fresh user');
        _localCache = null;
        return;
      }

      const data = snap.data();
      _localCache = data;

      console.log(LOG, '☁️  Loaded cosmetics for', uid, data);

      // ── Restore owned frames into _natFrames inventory ──────
      //    We call the existing grantFrame but skip the cloud
      //    write (pass __fromCloud flag) to avoid an echo loop.
      if (data.ownedFrames && window._natFrames?._grantLocal) {
        for (const frameId of Object.keys(data.ownedFrames)) {
          if (data.ownedFrames[frameId] === true) {
            window._natFrames._grantLocal(frameId);
          }
        }
      }

      // ── Restore equipped frame and apply to DOM ─────────────
      if (data.equippedFrame && window._natFrames) {
        // Write to RTDB (existing equip mechanism) silently
        await _rtdbEquip(uid, data.equippedFrame);
        // Apply visually right now without waiting for RTDB listener
        _applyFrameEverywhere(uid, data.equippedFrame);
        console.log(LOG, '🖼  Restored frame:', data.equippedFrame);
      }

    } catch (e) {
      console.error(LOG, 'syncFromCloud failed:', e);
    }
  }

  /* ----------------------------------------------------------
     4. saveToCloud()
        Write current runtime state → Firestore.
        Debounced: rapid calls collapse into one write.
  ---------------------------------------------------------- */
  async function saveToCloud(immediate = false) {
    const uid = _currentUID || window.currentUID;
    if (!uid) return;

    if (!immediate) {
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(() => saveToCloud(true), SAVE_DEBOUNCE_MS);
      return;
    }

    const fsReady = await _loadFirestore();
    if (!fsReady) return;

    try {
      const payload = await _buildPayload(uid);
      if (!payload) return;

      await _fsLib.setDoc(_profileRef(uid), payload, { merge: true });
      _localCache = payload;
      console.log(LOG, '💾 Saved cosmetics for', uid);
    } catch (e) {
      console.error(LOG, 'saveToCloud failed:', e);
    }
  }

  /* ----------------------------------------------------------
     5. _buildPayload()
        Assemble current runtime state into a Firestore document.
  ---------------------------------------------------------- */
  async function _buildPayload(uid) {
    if (!window._natFrames) return null;

    // Equipped frame — read from RTDB cache first, fall back to Firestore cache
    let equippedFrame = null;
    try {
      equippedFrame = await window._natFrames.getEquipped(uid);
    } catch (_) {}

    // Owned frames — read from inventory
    let ownedFrames = {};
    try {
      const inv = await window._natFrames.inventory();
      inv.forEach(({ frameId }) => { ownedFrames[frameId] = true; });
    } catch (_) {}

    // Merge in anything we already had from cloud (badges, title, etc.)
    const prev = _localCache || {};

    return {
      equippedFrame:  equippedFrame  ?? prev.equippedFrame  ?? null,
      ownedFrames:    Object.keys(ownedFrames).length ? ownedFrames : (prev.ownedFrames || {}),
      equippedBadges: prev.equippedBadges || [],
      equippedTitle:  prev.equippedTitle  || null,
      levelStyle:     prev.levelStyle     || null,
      updatedAt:      _fsLib.serverTimestamp(),
    };
  }

  /* ----------------------------------------------------------
     6. _rtdbEquip()
        Write equippedFrame to Realtime Database so the existing
        subscription system picks it up immediately.
  ---------------------------------------------------------- */
  async function _rtdbEquip(uid, frameId) {
    const fb = window._natFirebase;
    if (!fb?.ref || !fb?.set || !fb?.db) return;
    try {
      await fb.set(fb.ref(fb.db, `userProfiles/${uid}/equippedFrame`), frameId);
    } catch (e) {
      console.warn(LOG, '_rtdbEquip failed (non-fatal):', e);
    }
  }

  /* ----------------------------------------------------------
     7. _applyFrameEverywhere()
        Directly apply the frame to all DOM avatars for this uid
        right now, without waiting for the RTDB onValue callback.
        This covers the flash-of-no-frame on login.
  ---------------------------------------------------------- */
  function _applyFrameEverywhere(uid, frameId) {
    if (!window._natFrames?.applyUID) return;
    // applyUID applies a frame to all rendered [data-pfp-uid="${uid}"] elements
    window._natFrames.applyUID(uid, frameId);
    // Also update the internal runtime cache so the engine is consistent
    if (window._natFrames.cache) {
      window._natFrames.cache[uid] = frameId;
    }
  }

  /* ----------------------------------------------------------
     8. PATCH equip() and grant()
        Intercept the existing public methods and append a cloud
        save after each successful operation.
        Only patches once (_patched flag).
  ---------------------------------------------------------- */
  function _patchFrameEngine() {
    if (_patched || !window._natFrames) return;

    const engine = window._natFrames;

    // ── Patch equip ─────────────────────────────────────────
    const _originalEquip = engine.equip.bind(engine);
    engine.equip = async function (frameId) {
      await _originalEquip(frameId);
      // Persist immediately (no debounce) so equip feels instant
      await saveToCloud(true);
    };

    // ── Patch grant ─────────────────────────────────────────
    const _originalGrant = engine.grant.bind(engine);
    engine.grant = async function (frameId, source) {
      await _originalGrant(frameId, source);
      // Debounced — grants may come in batches (e.g., initial unlock flood)
      saveToCloud(false);
    };

    // ── Add _grantLocal (cloud-restore path, no RTDB write) ──
    //    Reads the RTDB inventory silently to reconcile state.
    engine._grantLocal = function (frameId) {
      // The RTDB already has this data (it's the source of truth for frame
      // engine state). _grantLocal is a no-op here because syncFromCloud
      // also writes back to RTDB via _rtdbEquip. The main job is just
      // ensuring _natFrames.cache is populated, which the onValue listener
      // handles. Nothing to do — ownership is already in RTDB inventory.
    };

    // ── Add public sync API ───────────────────────────────────
    engine.syncFromCloud = () => syncFromCloud();
    engine.saveToCloud   = () => saveToCloud(true);

    _patched = true;
    console.log(LOG, '🔧 equip() and grant() patched for cloud persistence');
  }

  /* ----------------------------------------------------------
     9. AUTH WATCHER
        Hooks into Firebase Auth to:
          • On sign-in  → syncFromCloud for that uid
          • On sign-out → clear local cache, detach state
        Replaces any previous listener cleanly.
  ---------------------------------------------------------- */
  function _watchAuth() {
    const auth = window._natFirebase?.auth;
    if (!auth) {
      console.warn(LOG, 'auth not available on _natFirebase');
      return;
    }

    // Clean up any previous listener
    if (_unsubAuth) {
      _unsubAuth();
      _unsubAuth = null;
    }

    const { onAuthStateChanged } =
      // onAuthStateChanged is already imported by app.js and available via auth
      // We access it through the Firebase auth module namespace
      window._natFirebase._authModule || {};

    // Fallback: import onAuthStateChanged ourselves if app.js didn't expose it
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
      .then(({ onAuthStateChanged }) => {

        _unsubAuth = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // New login or token refresh
            if (user.uid !== _currentUID) {
              console.log(LOG, '🔑 Auth state: signed in as', user.uid);
              _currentUID  = user.uid;
              _localCache  = null;   // invalidate stale cache from previous uid

              // Ensure engine is patched before sync
              _patchFrameEngine();

              // Pull cloud cosmetics and restore
              await syncFromCloud(user.uid);
            }
          } else {
            // Signed out
            console.log(LOG, '🔒 Auth state: signed out — clearing cosmetics cache');
            _currentUID = null;
            _localCache = null;
            clearTimeout(_saveTimer);
          }
        });

        console.log(LOG, '👂 Auth listener attached');
      })
      .catch(e => console.error(LOG, 'Failed to attach auth listener:', e));
  }

  /* ----------------------------------------------------------
     10. INIT
         Wait until both _natFirebase and _natFrames are ready,
         then boot. Uses polling with a cap to avoid zombie loops.
  ---------------------------------------------------------- */
  function _init() {
    const poll = setInterval(async () => {
      _initAttempts++;

      const fbReady     = !!window._natFirebase?.auth;
      const framesReady = !!window._natFrames?.equip;

      if (fbReady && framesReady) {
        clearInterval(poll);
        _boot();
        return;
      }

      if (_initAttempts >= MAX_INIT) {
        clearInterval(poll);
        console.warn(
          LOG,
          'Init timed out.',
          { fbReady, framesReady }
        );
      }
    }, 100);
  }

  async function _boot() {
   // console.log(LOG, '🚀 Booting cosmetics persistence layer…');

    // 1. Patch equip/grant on the already-live engine
    _patchFrameEngine();

    // 2. Pre-load Firestore SDK in background (doesn't block)
    _loadFirestore();

    // 3. Attach auth watcher (handles login, Google re-auth, token refresh)
    _watchAuth();

    // 4. If a user is already signed in right now (e.g., cached Google session
    //    that resolved before this script ran), sync immediately.
    //    FIX: also check auth.currentUser directly in case window.currentUID
    //    hasn't been set yet by app.js (race condition on dev account).
    const auth = window._natFirebase?.auth;
    const resolvedUID = window.currentUID
      || (auth?.currentUser ? auth.currentUser.uid : null);

    if (resolvedUID) {
      _currentUID = resolvedUID;
      await syncFromCloud(resolvedUID);
    } else if (auth && !window.currentUID) {
      // Auth object exists but UID not set yet — wait for first auth event
      // The _watchAuth() listener above will handle it once it fires.
      console.log(LOG, '⏳ Waiting for auth state before initial sync…');
    }

  //  console.log(LOG, '✅ Cosmetics sync ready');
  }

  /* ----------------------------------------------------------
     KICK OFF
  ---------------------------------------------------------- */
  _init();

})();
