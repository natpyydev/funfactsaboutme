/* ============================================================
   AVATAR FRAMES ENGINE — avatar-frames.js
   v1.0 — Phase 3

   LOAD ORDER: defer, after app.js (which sets window._natFirebase
   and window._natPfp). Add to index.html as:
     <script defer src="avatar-frames.js"></script>

   DEPENDS ON (globals set by app.js):
     window._natFirebase  → { db, ref, onValue, set, get }
     window._natPfp       → { load, cache, fetch, apply }
     window.currentUID    → string | null
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     1. FRAME REGISTRY
     Static definitions. JS manages class names only —
     all visuals are pure CSS (avatar-frames.css).
  ────────────────────────────────────────────────────────── */

  const FRAME_REGISTRY = {
    cyber_neon: {
      id:      'cyber_neon',
      label:   'Cyber Neon',
      tier:    'legendary',
      icon:    '⚡',
      layers: [
        'ring-outer',
        'ring-inner',
        'scan',
        'glow',
        'spark',
        'spark-2',
        'pulse',
      ],
    },
    galactic: {
      id:      'galactic',
      label:   'Galactic Cosmic',
      tier:    'legendary',
      icon:    '🌌',
      layers: [
        'nebula',
        'ring-outer',
        'ring-inner',
        'shimmer',
        'glow',
        'star-1',
        'star-2',
        'star-3',
      ],
    },
    hellfire: {
      id:      'hellfire',
      label:   'Hellfire',
      tier:    'legendary',
      icon:    '🔥',
      layers: [
        'flame-base',
        'flame-outer',
        'ring-molten',
        'heat',
        'glow',
        'ember-1',
        'ember-2',
        'ember-3',
        'ember-4',
        'ember-5',
        'ember-6',
      ],
    },
    heaven_divine: {
      id:      'heaven_divine',
      label:   'Heaven Divine',
      tier:    'legendary',
      icon:    '✨',
      layers: [
        'rays',
        'halo',
        'ring-inner',
        'glow',
        'orb-1',
        'orb-2',
        'orb-3',
        'pulse',
      ],
    },
    y2k_chrome: {
      id:      'y2k_chrome',
      label:   'Y2K Chrome',
      tier:    'epic',
      icon:    '💿',
      layers: [
        'ring-chrome',
        'holo',
        'scanlines',
        'glitch',
        'glitch-b',
        'glow',
      ],
    },
    forest_spirit: {
      id:      'forest_spirit',
      label:   'Forest Spirit',
      tier:    'epic',
      icon:    '🌿',
      layers: [
        'ring-vine',
        'ring-wisp',
        'glow',
        'leaf-1',
        'leaf-2',
        'leaf-3',
        'leaf-4',
        'wisp-1',
        'wisp-2',
        'wisp-3',
        'pulse',
      ],
    },
    developer: {
      id:      'developer',
      label:   'Developer',
      tier:    'developer',
      icon:    '👑',
      layers: [
        'holo-ring',
        'rgb-ring',
        'shine',
        'particle-1',
        'particle-2',
        'particle-3',
        'particle-4',
        'particle-5',
        'particle-6',
        'glow-pulse',
        'glitch-a',
        'glitch-b',
      ],
    },
  };


  /* ──────────────────────────────────────────────────────────
     2. RUNTIME CACHES
     Mirror the _pfpCache pattern from app.js exactly.
  ────────────────────────────────────────────────────────── */

  // { [uid]: frameId | null }  — null = loaded, no frame equipped
  const _frameCache = {};

  // { [uid]: Firebase unsubscribe function }
  const _frameSubs  = {};

  // Intersection Observer — pauses animations when off-screen
  let _io = null;


  /* ──────────────────────────────────────────────────────────
     3. FIREBASE HELPERS
     Resolved lazily after app.js sets window._natFirebase.
  ────────────────────────────────────────────────────────── */

  function _fb() {
    return window._natFirebase;
  }

  function _uid() {
    return window.currentUID || null;
  }


  /* ──────────────────────────────────────────────────────────
     4. DOM BUILDER — build the frame layer tree
  ────────────────────────────────────────────────────────── */

  /**
   * Build a .nat-frame div with all layer children for a given frame ID.
   * @param {string} frameId
   * @returns {HTMLElement}
   */
  function _buildFrameEl(frameId) {
    const def = FRAME_REGISTRY[frameId];
    if (!def) return null;

    const frame = document.createElement('div');
    frame.className = `nat-frame nat-frame--${frameId}`;
    frame.setAttribute('aria-hidden', 'true');
    frame.dataset.frameId = frameId;

    def.layers.forEach(layerName => {
      const layer = document.createElement('div');
      layer.className = `nat-frame__layer nat-frame__${layerName}`;
      frame.appendChild(layer);
    });

    return frame;
  }


  /* ──────────────────────────────────────────────────────────
     5. CORE: applyAvatarFrame(containerEl, frameId)
     The single public primitive. All other functions call this.
  ────────────────────────────────────────────────────────── */

  /**
   * Apply (or remove) an animated frame on any avatar container element.
   * Safe to call multiple times — removes old frame before applying new one.
   *
   * @param {HTMLElement} containerEl  The avatar wrapper (.msg-pfp-avatar, .lb-pfp-avatar, #profPfp, etc.)
   * @param {string|null} frameId      Frame ID from FRAME_REGISTRY, or null to remove
   */
  function applyAvatarFrame(containerEl, frameId) {
    if (!containerEl) return;

    // Remove any existing frame (including old tier badge)
    _removeFrame(containerEl);

    if (!frameId || !FRAME_REGISTRY[frameId]) return;

    // Mark host
    containerEl.classList.add('nat-frame-host');

    // Inject frame layers
    const frameEl = _buildFrameEl(frameId);
    if (!frameEl) return;
    containerEl.appendChild(frameEl);

    // Register with IntersectionObserver for off-screen pause
    if (_io) _io.observe(containerEl);
  }


  /**
   * Remove frame from a container element cleanly.
   * @param {HTMLElement} containerEl
   */
  function _removeFrame(containerEl) {
    if (!containerEl) return;

    // Remove existing frame element(s)
    containerEl.querySelectorAll('.nat-frame').forEach(el => el.remove());
    containerEl.querySelectorAll('.nat-frame-tier-badge').forEach(el => el.remove());
    containerEl.classList.remove('nat-frame-host');

    if (_io) _io.unobserve(containerEl);
  }


  /* ──────────────────────────────────────────────────────────
     6. APPLY TO ALL ELEMENTS FOR A UID
     Finds every data-pfp-uid element in the live DOM for that uid
     and applies the frame. Called by the realtime listener and
     by the _natPfp pipeline patch.
  ────────────────────────────────────────────────────────── */

  /**
   * Apply frame to ALL avatar elements for a given UID in the current DOM.
   * @param {string}      uid
   * @param {string|null} frameId
   */
  function applyFrameToUID(uid, frameId) {
    if (!uid) return;

    // Update cache
    _frameCache[uid] = frameId || null;

    // data-pfp-uid elements (chat, leaderboard, etc.)
    document.querySelectorAll(`[data-pfp-uid="${CSS.escape(uid)}"]`).forEach(el => {
      applyAvatarFrame(el, frameId);
    });

    // Profile page self-avatar (only shown for the current user)
    if (uid === _uid()) {
      const profEl = document.getElementById('profPfp');
      if (profEl) applyAvatarFrame(profEl, frameId);
    }
  }


  /* ──────────────────────────────────────────────────────────
     7. FIREBASE: REALTIME SUBSCRIPTION PER UID
     Mirrors the _pfpCache pattern: one subscription per uid seen.
  ────────────────────────────────────────────────────────── */

  /**
   * Subscribe to equippedFrame changes for a uid in Firebase.
   * Idempotent — skips if already subscribed.
   * @param {string} uid
   */
  function _subscribeFrameForUID(uid) {
    if (!uid || _frameSubs[uid]) return;

    const fb = _fb();
    if (!fb) return;

    const frameRef = fb.ref(fb.db, `userProfiles/${uid}/equippedFrame`);

    const unsub = fb.onValue(frameRef, snap => {
      const frameId = snap.val() || null;
      applyFrameToUID(uid, frameId);
    });

    _frameSubs[uid] = unsub;
  }


  /* ──────────────────────────────────────────────────────────
     8. PIPELINE PATCH
     Wraps window._natPfp.apply so every time a pfp image is
     rendered, we also apply the correct frame — with zero
     changes to app.js.
  ────────────────────────────────────────────────────────── */

  function _patchNatPfpPipeline() {
    if (!window._natPfp) return false;

    const original_apply = window._natPfp.apply;

    // Patch _applyPfpEl
    window._natPfp.apply = function patchedApplyPfpEl(el, pfpSrc) {
      // Run original pfp logic first
      original_apply(el, pfpSrc);

      // Then apply frame on top
      const uid = el?.dataset?.pfpUid;
      if (uid) {
        if (_frameCache[uid] !== undefined) {
          // Frame already cached — apply immediately
          applyAvatarFrame(el, _frameCache[uid]);
        } else {
          // Trigger subscription; frame will apply via the onValue callback
          _subscribeFrameForUID(uid);
        }
      }
    };

    // Patch _loadPfpsInContainer — subscribe for all uids in a newly-rendered
    // container (chat scroll, leaderboard refresh, etc.)
    const original_load = window._natPfp.load;
    window._natPfp.load = function patchedLoadPfps(container) {
      original_load(container);
      container.querySelectorAll('[data-pfp-uid]').forEach(el => {
        const uid = el.dataset.pfpUid;
        if (uid) _subscribeFrameForUID(uid);
      });
    };

    return true;
  }


  /* ──────────────────────────────────────────────────────────
     9. EQUIP / UNEQUIP — writes to Firebase
  ────────────────────────────────────────────────────────── */

  /**
   * Equip a frame for the currently authenticated user.
   * Writes to Firebase → triggers onValue → updates DOM live.
   * @param {string|null} frameId  Pass null to unequip.
   * @returns {Promise<void>}
   */
  async function equipFrame(frameId) {
    const uid = _uid();
    if (!uid) { console.warn('[natFrames] equipFrame: no auth uid'); return; }

    if (frameId && !FRAME_REGISTRY[frameId]) {
      console.warn('[natFrames] equipFrame: unknown frame:', frameId);
      return;
    }

    const fb = _fb();
    if (!fb) return;

    const frameRef = fb.ref(fb.db, `userProfiles/${uid}/equippedFrame`);

    try {
      await fb.set(frameRef, frameId || null);
      // The onValue listener will fire and call applyFrameToUID automatically.
    } catch (e) {
      console.error('[natFrames] equipFrame write failed:', e);
    }
  }


  /**
   * Unequip the current user's frame (sets equippedFrame to null).
   * @returns {Promise<void>}
   */
  async function unequipFrame() {
    return equipFrame(null);
  }


  /* ──────────────────────────────────────────────────────────
     10. INVENTORY MANAGEMENT
  ────────────────────────────────────────────────────────── */

  /**
   * Grant a frame to the current user's inventory.
   * Called by achievement/shop/admin systems.
   * @param {string} frameId
   * @param {string} source  'achievement' | 'purchase' | 'gift' | 'event'
   * @returns {Promise<void>}
   */
  async function grantFrame(frameId, source = 'purchase') {
    const uid = _uid();
    if (!uid) { console.warn('[natFrames] grantFrame: no auth uid'); return; }
    if (!FRAME_REGISTRY[frameId]) { console.warn('[natFrames] grantFrame: unknown frame:', frameId); return; }

    const fb = _fb();
    if (!fb) return;

    const invRef = fb.ref(fb.db, `userFrameInventory/${uid}/${frameId}`);
    try {
      // Only write if not already owned (don't overwrite original unlock data)
      const snap = await fb.get(invRef);
      if (!snap.exists()) {
        await fb.set(invRef, {
          unlockedAt: Date.now(),
          source,
        });
      }
    } catch (e) {
      console.error('[natFrames] grantFrame write failed:', e);
    }
  }


  /**
   * Get all frames in the current user's inventory.
   * Returns array of objects: { frameId, def, unlockedAt, source }
   * @returns {Promise<Array>}
   */
  async function getMyFrameInventory() {
    const uid = _uid();
    if (!uid) return [];

    const fb = _fb();
    if (!fb) return [];

    const invRef = fb.ref(fb.db, `userFrameInventory/${uid}`);
    try {
      const snap = await fb.get(invRef);
      if (!snap.exists()) return [];

      const result = [];
      snap.forEach(child => {
        const frameId = child.key;
        const data    = child.val();
        if (FRAME_REGISTRY[frameId]) {
          result.push({
            frameId,
            def:        FRAME_REGISTRY[frameId],
            unlockedAt: data.unlockedAt || 0,
            source:     data.source || 'unknown',
          });
        }
      });

      // Sort: legendary first, then by unlock time
      result.sort((a, b) => {
        const tierOrder = { legendary: 0, epic: 1 };
        const ta = tierOrder[a.def.tier] ?? 2;
        const tb = tierOrder[b.def.tier] ?? 2;
        if (ta !== tb) return ta - tb;
        return b.unlockedAt - a.unlockedAt;
      });

      return result;
    } catch (e) {
      console.error('[natFrames] getMyFrameInventory failed:', e);
      return [];
    }
  }


  /**
   * Get the currently equipped frame ID for any uid.
   * Reads from cache first, falls back to Firebase.
   * @param {string} uid
   * @returns {Promise<string|null>}
   */
  async function getEquippedFrame(uid) {
    if (!uid) return null;
    if (_frameCache[uid] !== undefined) return _frameCache[uid];

    const fb = _fb();
    if (!fb) return null;

    try {
      const snap = await fb.get(fb.ref(fb.db, `userProfiles/${uid}/equippedFrame`));
      const frameId = snap.val() || null;
      _frameCache[uid] = frameId;
      return frameId;
    } catch {
      return null;
    }
  }


  /**
   * Check if current user owns a specific frame.
   * @param {string} frameId
   * @returns {Promise<boolean>}
   */
  async function ownsFrame(frameId) {
    const uid = _uid();
    if (!uid) return false;

    const fb = _fb();
    if (!fb) return false;

    try {
      const snap = await fb.get(fb.ref(fb.db, `userFrameInventory/${uid}/${frameId}`));
      return snap.exists();
    } catch {
      return false;
    }
  }


  /* ──────────────────────────────────────────────────────────
     11. INTERSECTION OBSERVER — pause off-screen animations
     Uses will-change + animation-play-state to save GPU on
     long pages where many avatars are rendered off-screen.
  ────────────────────────────────────────────────────────── */

  function _initIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    _io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const frameEl = entry.target.querySelector('.nat-frame');
        if (!frameEl) return;

        const layers = frameEl.querySelectorAll('.nat-frame__layer');
        const state  = entry.isIntersecting ? 'running' : 'paused';
        layers.forEach(l => { l.style.animationPlayState = state; });
      });
    }, {
      rootMargin: '120px 0px', // resume slightly before coming into view
      threshold:  0,
    });
  }


  /* ──────────────────────────────────────────────────────────
     12. SELF-SUBSCRIBE CURRENT USER
     When the current user's uid becomes available, subscribe
     to their own equippedFrame so their own avatars update live
     (profile page pfp, their own messages, etc.).
  ────────────────────────────────────────────────────────── */

  function _watchCurrentUser() {
    // Poll for currentUID since it's set by the app.js auth callback
    const poll = setInterval(() => {
      const uid = _uid();
      if (uid) {
        clearInterval(poll);
        _subscribeFrameForUID(uid);
      }
    }, 200);

    // Safety — stop polling after 15s
    setTimeout(() => clearInterval(poll), 15000);
  }


  /* ──────────────────────────────────────────────────────────
     13. MUTATION OBSERVER
     Watches for new avatar elements added to the DOM after
     initial page load (infinite scroll, dynamic renders, etc.)
     and applies frames to them automatically.
  ────────────────────────────────────────────────────────── */

  function _initMutationObserver() {
    const mo = new MutationObserver(mutations => {
      mutations.forEach(mut => {
        mut.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return; // elements only

          // Check if the node itself is an avatar element
          if (node.dataset?.pfpUid) {
            _handleNewAvatarEl(node);
          }

          // Or if it contains avatar elements
          node.querySelectorAll?.('[data-pfp-uid]').forEach(el => {
            _handleNewAvatarEl(el);
          });
        });
      });
    });

    mo.observe(document.body, { childList: true, subtree: true });
  }

  function _handleNewAvatarEl(el) {
    const uid = el.dataset.pfpUid;
    if (!uid) return;

    if (_frameCache[uid] !== undefined) {
      // Already know this uid's frame — apply immediately
      applyAvatarFrame(el, _frameCache[uid]);
    } else {
      // Unknown uid — subscribe (onValue will apply frame once loaded)
      _subscribeFrameForUID(uid);
    }
  }


  /* ──────────────────────────────────────────────────────────
     14. INIT
     Wait for _natPfp and _natFirebase to be set by app.js,
     then patch the pipeline and start watching.
  ────────────────────────────────────────────────────────── */

  function _init() {
    // Retry until app.js has set both globals
    const MAX_ATTEMPTS = 60; // 6 seconds @ 100ms
    let attempts = 0;

    const ready = setInterval(() => {
      attempts++;

      const pfpReady = !!window._natPfp;
      const fbReady  = !!window._natFirebase;

      if (pfpReady && fbReady) {
        clearInterval(ready);
        _boot();
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(ready);
        console.warn('[natFrames] init timed out waiting for _natPfp / _natFirebase');
      }
    }, 100);
  }

  function _boot() {
    // 1. Patch the pfp pipeline — must come first
    _patchNatPfpPipeline();

    // 2. Set up IntersectionObserver for GPU savings
    _initIntersectionObserver();

    // 3. Watch for dynamically-added avatar elements
    _initMutationObserver();

    // 4. Subscribe current user's own frame for live updates
    _watchCurrentUser();

    // 5. Apply frames to any avatar elements already in the DOM
    //    (in case this script runs after initial render)
    document.querySelectorAll('[data-pfp-uid]').forEach(el => {
      _handleNewAvatarEl(el);
    });

    // console.log('[natFrames] ✅ Avatar frame engine ready');
  }


  /* ──────────────────────────────────────────────────────────
     14b. FRAME UNLOCK ECONOMY
     Defines HOW each frame can be earned and exposes
     unlockFrame(frameId, method) for use by levels, quests,
     seasonal events, secret codes, and reactions.
  ────────────────────────────────────────────────────────── */

  /**
   * Unlock methods and requirements per frame.
   * Checked by unlockFrame() before calling grantFrame().
   *
   * Structure:
   *   FRAME_UNLOCK_RULES[frameId] = [
   *     { method: 'level',    level: 5 },
   *     { method: 'prestige', prestige: 1 },
   *     { method: 'quest',    questId: 'quest_photographer' },
   *     { method: 'reactions',count: 100 },
   *     { method: 'seasonal', season: 'christmas_2025' },
   *     { method: 'code',     code: 'HEAVEN_ACCESS' },
   *     { method: 'event',    eventId: 'birthday_2025' },
   *     { method: 'dev' }   // dev-only, no user path
   *   ]
   */
  const FRAME_UNLOCK_RULES = {
    cyber_neon:    [
      { method: 'level',    level: 10,   label: 'Reach Level 10' },
      { method: 'prestige', prestige: 1, label: 'Prestige once' },
      { method: 'code',     code: 'CYBER_INIT', label: 'Enter secret code' },
    ],
    galactic:      [
      { method: 'level',    level: 20,   label: 'Reach Level 20' },
      { method: 'prestige', prestige: 2, label: 'Prestige twice' },
      { method: 'seasonal', season: 'space_event', label: 'Unlock during space event' },
    ],
    hellfire:      [
      { method: 'level',    level: 15,   label: 'Reach Level 15' },
      { method: 'quest',    questId: 'quest_hellfire',  label: 'Complete the Hellfire quest' },
    ],
    heaven_divine: [
      { method: 'level',    level: 15,   label: 'Reach Level 15' },
      { method: 'quest',    questId: 'quest_heaven',    label: 'Complete the Heaven quest' },
    ],
    y2k_chrome:    [
      { method: 'level',    level: 5,    label: 'Reach Level 5' },
      { method: 'reactions',count: 50,   label: 'Send 50 total reactions' },
      { method: 'seasonal', season: 'y2k_event',        label: 'Unlock during Y2K event' },
    ],
    forest_spirit: [
      { method: 'level',    level: 8,    label: 'Reach Level 8' },
      { method: 'quest',    questId: 'quest_forest',    label: 'Complete the Forest quest' },
    ],
  };

  /**
   * Returns the unlock rules for a frame, or [] if not defined.
   * @param {string} frameId
   * @returns {Array}
   */
  function getFrameUnlockRules(frameId) {
    return FRAME_UNLOCK_RULES[frameId] || [];
  }

  /**
   * Attempt to unlock a frame for the current user.
   * Validates the method + requirement before granting.
   *
   * @param {string} frameId
   * @param {string} method   'level' | 'prestige' | 'quest' | 'reactions' | 'seasonal' | 'code' | 'event' | 'dev'
   * @param {object} [ctx]    Context: { level, prestige, questId, count, season, code, eventId }
   * @returns {Promise<{success: boolean, reason?: string}>}
   */
  async function unlockFrame(frameId, method, ctx = {}) {
    if (!FRAME_REGISTRY[frameId]) {
      return { success: false, reason: 'unknown_frame' };
    }

    const rules = FRAME_UNLOCK_RULES[frameId] || [];

    // Dev-only frames (no rules) — only grantable via grantFrame() directly
    if (rules.length === 0 && method !== 'dev') {
      return { success: false, reason: 'dev_only' };
    }

    // Find a matching rule
    const match = rules.find(r => {
      if (r.method !== method) return false;
      switch (method) {
        case 'level':     return (ctx.level    || 0) >= (r.level    || 0);
        case 'prestige':  return (ctx.prestige  || 0) >= (r.prestige  || 0);
        case 'quest':     return ctx.questId    === r.questId;
        case 'reactions': return (ctx.count     || 0) >= (r.count     || 0);
        case 'seasonal':  return ctx.season     === r.season;
        case 'code':      return ctx.code?.trim().toUpperCase() === r.code;
        case 'event':     return ctx.eventId    === r.eventId;
        case 'dev':       return true;
        default:          return false;
      }
    });

    if (!match && method !== 'dev') {
      return { success: false, reason: 'requirement_not_met' };
    }

    // Check already owned
    const alreadyOwned = await ownsFrame(frameId);
    if (alreadyOwned) {
      return { success: false, reason: 'already_owned' };
    }

    // Grant it!
    await grantFrame(frameId, method);
    return { success: true };
  }

  /**
   * Check which frames the current user can unlock at their current level/prestige.
   * Useful for showing "X frames available to unlock!" notifications.
   * @param {object} ctx  { level, prestige, totalReactions }
   * @returns {Promise<string[]>}  Array of unlockable frameIds
   */
  async function getUnlockableFrames(ctx = {}) {
    const uid = _uid();
    if (!uid) return [];

    const result = [];
    for (const [frameId, rules] of Object.entries(FRAME_UNLOCK_RULES)) {
      const owned = await ownsFrame(frameId);
      if (owned) continue;
      const canUnlock = rules.some(r => {
        switch (r.method) {
          case 'level':     return (ctx.level    || 0) >= (r.level    || 0);
          case 'prestige':  return (ctx.prestige  || 0) >= (r.prestige  || 0);
          case 'reactions': return (ctx.count     || 0) >= (r.count     || 0);
          default:          return false; // codes/quests/events need explicit trigger
        }
      });
      if (canUnlock) result.push(frameId);
    }
    return result;
  }


  /* ──────────────────────────────────────────────────────────
     15. PUBLIC API
  ────────────────────────────────────────────────────────── */

  window._natFrames = {
    // Core
    apply:         applyAvatarFrame,        // applyAvatarFrame(el, frameId)
    applyUID:      applyFrameToUID,          // applyFrameToUID(uid, frameId)
    remove:        _removeFrame,             // _removeFrame(el)

    // Auth user actions
    equip:         equipFrame,               // equipFrame(frameId) → Promise
    unequip:       unequipFrame,             // unequipFrame() → Promise

    // Inventory
    grant:         grantFrame,              // grantFrame(frameId, source) → Promise
    inventory:     getMyFrameInventory,     // getMyFrameInventory() → Promise<Array>
    owns:          ownsFrame,               // ownsFrame(frameId) → Promise<bool>
    getEquipped:   getEquippedFrame,        // getEquippedFrame(uid) → Promise<string|null>

    // Unlock economy (Part 4)
    unlock:        unlockFrame,             // unlockFrame(frameId, method, ctx) → Promise<{success,reason}>
    unlockRules:   getFrameUnlockRules,     // getFrameUnlockRules(frameId) → Array
    unlockable:    getUnlockableFrames,     // getUnlockableFrames(ctx) → Promise<string[]>

    // Data
    registry:      FRAME_REGISTRY,         // static frame definitions
    cache:         _frameCache,             // live uid→frameId cache (read-only)

    // Internals (for debugging / Phase 5 integration)
    _subscribe:    _subscribeFrameForUID,
    _build:        _buildFrameEl,
  };

  // Kick off init
  _init();

})();
