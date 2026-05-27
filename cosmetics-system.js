/* ============================================================
   COSMETICS SYSTEM — cosmetics-system.js
   Central registry + runtime state layer for ALL cosmetics.

   Provides:
     · TITLE_REGISTRY       — all earnable titles
     · RARITY_META          — rarity color tokens
     · CosmeticsSystem      — singleton on window._natCosmetics
     · equip/unequip API for frames, badges, titles
     · Firestore-backed persistence (piggybacks cosmetics-sync.js)
     · Events: 'nat-cosmetics-change' dispatched on any equip

   LOAD ORDER:
     1. app.js
     2. avatar-frames.js
     3. cosmetics-sync.js
     4. THIS FILE (defer, before inventory-ui.js)
     5. inventory-ui.js

   DEPENDS ON (globals):
     window._natFirebase   — Firebase app + RTDB helpers
     window._natFrames     — frame engine (avatar-frames.js)
     window.currentUID     — set by app.js auth callback
     window.isVIP          — set by vip.js (optional)
     window.getLevelInfo   — set by levels.js (optional)

   PUBLIC API  (window._natCosmetics):
     .getState()           → deep-clone of current runtime state
     .getFrames()          → Promise<FrameEntry[]>
     .getBadges()          → Promise<BadgeEntry[]>
     .getTitles()          → Promise<TitleEntry[]>
     .equipFrame(id)       → Promise<void>
     .equipBadge(id)       → Promise<void>  (toggles)
     .equipTitle(id)       → Promise<void>  (toggles)
     .unequipFrame()       → Promise<void>
     .unequipTitle()       → Promise<void>
     .syncFromCloud()      → Promise<void>
     .saveToCloud()        → Promise<void>
   ============================================================ */

(function () {
  'use strict';

  const LOG = '[cosmeticsSystem]';
  const SAVE_DEBOUNCE_MS = 900;
  const MAX_EQUIPPED_BADGES = 3;

  /* ----------------------------------------------------------
     1. RARITY META
        Single source of truth for rarity colors.
        Used by inventory-ui.js for card borders and labels.
  ---------------------------------------------------------- */
  const RARITY_META = {
    developer: {
      label: 'DEVELOPER',
      color: '#bf6fff',
      glow:  'rgba(160,80,255,0.55)',
      bg:    'rgba(160,80,255,0.08)',
    },
    legendary: {
      label: 'LEGENDARY',
      color: '#ffb800',
      glow:  'rgba(255,184,0,0.50)',
      bg:    'rgba(255,184,0,0.07)',
    },
    mythic: {
      label: 'MYTHIC',
      color: '#ff4cbc',
      glow:  'rgba(255,76,188,0.45)',
      bg:    'rgba(255,76,188,0.07)',
    },
    epic: {
      label: 'EPIC',
      color: '#a78bfa',
      glow:  'rgba(167,139,250,0.45)',
      bg:    'rgba(167,139,250,0.07)',
    },
    sacred: {
      label: 'SACRED',
      color: '#fde68a',
      glow:  'rgba(253,230,138,0.40)',
      bg:    'rgba(253,230,138,0.06)',
    },
    rare: {
      label: 'RARE',
      color: '#60a5fa',
      glow:  'rgba(96,165,250,0.40)',
      bg:    'rgba(96,165,250,0.07)',
    },
    uncommon: {
      label: 'UNCOMMON',
      color: '#4ade80',
      glow:  'rgba(74,222,128,0.35)',
      bg:    'rgba(74,222,128,0.06)',
    },
    common: {
      label: 'COMMON',
      color: '#94a3b8',
      glow:  'rgba(148,163,184,0.25)',
      bg:    'rgba(148,163,184,0.05)',
    },
    cursed: {
      label: 'CURSED',
      color: '#f87171',
      glow:  'rgba(248,113,113,0.45)',
      bg:    'rgba(248,113,113,0.07)',
    },
    classified: {
      label: 'CLASSIFIED',
      color: '#334155',
      glow:  'rgba(51,65,85,0.6)',
      bg:    'rgba(51,65,85,0.12)',
    },
  };

  /* ----------------------------------------------------------
     2. TITLE REGISTRY
        All earnable/unlockable titles.
        unlock.type: 'level' | 'vip' | 'badge' | 'developer' | 'free'
        unlock.value: threshold/id for that type
  ---------------------------------------------------------- */
  const TITLE_REGISTRY = [
    // Free / starter
    {
      id: 'newbie',
      label: '🌱 Newbie',
      rarity: 'common',
      unlock: { type: 'free' },
      desc: 'Everyone starts somewhere.',
    },
    {
      id: 'lurker',
      label: '👻 Lurker',
      rarity: 'common',
      unlock: { type: 'free' },
      desc: 'Silent but present.',
    },
    // Level unlocks
    {
      id: 'rising_star',
      label: '⭐ Rising Star',
      rarity: 'uncommon',
      unlock: { type: 'level', value: 10 },
      desc: 'Reach level 10.',
    },
    {
      id: 'adept',
      label: '🔮 Adept',
      rarity: 'uncommon',
      unlock: { type: 'level', value: 20 },
      desc: 'Reach level 20.',
    },
    {
      id: 'veteran',
      label: '🛡️ Veteran',
      rarity: 'rare',
      unlock: { type: 'level', value: 30 },
      desc: 'Reach level 30.',
    },
    {
      id: 'elite',
      label: '💎 Elite',
      rarity: 'rare',
      unlock: { type: 'level', value: 40 },
      desc: 'Reach level 40.',
    },
    {
      id: 'champion',
      label: '🏆 Champion',
      rarity: 'epic',
      unlock: { type: 'level', value: 50 },
      desc: 'Reach level 50.',
    },
    {
      id: 'sovereign',
      label: '👁️ Sovereign',
      rarity: 'epic',
      unlock: { type: 'level', value: 60 },
      desc: 'Reach level 60.',
    },
    {
      id: 'cosmic_drifter',
      label: '🌌 Cosmic Drifter',
      rarity: 'legendary',
      unlock: { type: 'level', value: 70 },
      desc: 'Reach level 70.',
    },
    {
      id: 'ascended',
      label: '✨ Ascended',
      rarity: 'legendary',
      unlock: { type: 'level', value: 80 },
      desc: 'Reach level 80.',
    },
    {
      id: 'transcendent',
      label: '🌟 Transcendent',
      rarity: 'mythic',
      unlock: { type: 'level', value: 90 },
      desc: 'Reach level 90.',
    },
    {
      id: 'legend',
      label: '⭐ Legend',
      rarity: 'mythic',
      unlock: { type: 'level', value: 99 },
      desc: 'Reach max level 99.',
    },
    // VIP
    {
      id: 'vip_diamond',
      label: '💎 Diamond',
      rarity: 'mythic',
      unlock: { type: 'vip' },
      desc: 'VIP exclusive title.',
    },
    {
      id: 'vip_royalty',
      label: '👑 Royalty',
      rarity: 'mythic',
      unlock: { type: 'vip' },
      desc: 'VIP exclusive title.',
    },
    // Developer
    {
      id: 'architect',
      label: '🛠️ Architect',
      rarity: 'developer',
      unlock: { type: 'developer' },
      desc: 'Built this world.',
    },
    {
      id: 'root_access',
      label: '⚡ Root Access',
      rarity: 'developer',
      unlock: { type: 'developer' },
      desc: 'All systems open.',
    },
  ];

  /* ----------------------------------------------------------
     3. RUNTIME STATE
        Single mutable state object — never exposed directly.
  ---------------------------------------------------------- */
  let _state = {
    equippedFrame:  null,   // string | null
    equippedBadges: [],     // string[]  (max MAX_EQUIPPED_BADGES)
    equippedTitle:  null,   // string | null  (title id)
    ownedFrames:    {},     // { [frameId]: true }
    ownedBadges:    [],     // string[] — all earned badge ids
    ownedTitles:    [],     // string[] — earned title ids
    levelStyle:     null,
  };

  let _saveTimer   = null;
  let _fsDb        = null;
  let _fsLib       = null;
  let _uid         = null;
  let _ready       = false;
  let _initAttempts = 0;
  const MAX_INIT   = 100;

  /* ----------------------------------------------------------
     4. FIRESTORE HELPERS
  ---------------------------------------------------------- */
  async function _loadFirestore() {
    if (_fsLib) return true;
    try {
      const mod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      if (!window._natFirebase?.app) return false;
      _fsDb  = mod.getFirestore(window._natFirebase.app);
      _fsLib = { doc: mod.doc, getDoc: mod.getDoc, setDoc: mod.setDoc, serverTimestamp: mod.serverTimestamp };
      return true;
    } catch (e) {
      console.error(LOG, 'Firestore load failed:', e);
      return false;
    }
  }

  function _profileRef(uid) {
    return _fsLib.doc(_fsDb, 'users', uid, 'cosmetics', 'profile');
  }

  /* ----------------------------------------------------------
     5. UNLOCK CHECKS
  ---------------------------------------------------------- */
  function _isDeveloper() {
    const uid  = window.currentUID || null;
    const ADMIN1 = 'zNDEej9J3kg79fUYxJjxLqrXJpz2';
    const ADMIN2 = '8IumnftXW1gJCa4iNbicZ0M0LOg2';
    return uid === ADMIN1 || uid === ADMIN2;
  }

  function _currentLevel() {
    try {
      return window.getLevelInfo?.().level ?? 1;
    } catch (_) { return 1; }
  }

  function _isVIP() {
    try { return window.isVIP?.() ?? false; } catch (_) { return false; }
  }

  /**
   * Check whether the current user has unlocked a given title.
   * @param {Object} titleDef
   * @returns {boolean}
   */
  function _isTitleUnlocked(titleDef) {
    const { type, value } = titleDef.unlock;
    switch (type) {
      case 'free':      return true;
      case 'level':     return _currentLevel() >= value;
      case 'vip':       return _isVIP() || _isDeveloper();
      case 'developer': return _isDeveloper();
      case 'badge':     return _state.ownedBadges.includes(value);
      default:          return false;
    }
  }

  /* ----------------------------------------------------------
     6. PUBLIC GETTERS
  ---------------------------------------------------------- */

  function getState() {
    return JSON.parse(JSON.stringify(_state));
  }

  /**
   * Returns enriched frame list with owned/equipped/locked flags.
   * @returns {Promise<Array>}
   */
  async function getFrames() {
    const engine = window._natFrames;
    if (!engine) return [];

    let inventory = [];
    try { inventory = await engine.inventory(); } catch (_) {}

    const ownedSet = new Set(inventory.map(f => f.frameId));

    // Merge RTDB owned with Firestore owned cache
    Object.keys(_state.ownedFrames).forEach(id => ownedSet.add(id));

    // FRAME_REGISTRY is on the engine
    const registry = engine.REGISTRY || {};

    return Object.values(registry).map(def => ({
      id:       def.id,
      label:    def.label,
      icon:     def.icon || '🖼️',
      rarity:   def.tier || 'common',
      owned:    ownedSet.has(def.id),
      equipped: _state.equippedFrame === def.id,
      def,
    }));
  }

  /**
   * Returns all known badges with owned/equipped flags.
   * Requires window.BADGES (badges.js export) to be resolvable.
   * @returns {Promise<Array>}
   */
  async function getBadges() {
    // Flatten the BADGES registry from badges.js
    const rawBadges = _collectAllBadgeDefs();

    // De-duplicate by group — keep highest tier per group
    const byGroup = {};
    rawBadges.forEach(b => {
      const prev = byGroup[b.group];
      if (!prev || (b.need || 0) > (prev.need || 0)) byGroup[b.group] = b;
    });

    const earned = new Set(_state.ownedBadges);
    const equipped = new Set(_state.equippedBadges);

    return Object.values(byGroup).map(b => ({
      id:       b.id,
      label:    b.label,
      icon:     b.icon || '🏅',
      rarity:   _badgeRarity(b),
      owned:    earned.has(b.id),
      equipped: equipped.has(b.id),
      desc:     b.desc || '',
      anim:     b.anim || '',
    }));
  }

  /**
   * Returns all titles with unlocked/equipped flags.
   * @returns {Promise<Array>}
   */
  async function getTitles() {
    return TITLE_REGISTRY.map(t => ({
      ...t,
      unlocked: _isTitleUnlocked(t),
      equipped: _state.equippedTitle === t.id,
    }));
  }

  /* ----------------------------------------------------------
     7. EQUIP ACTIONS
  ---------------------------------------------------------- */

  async function equipFrame(frameId) {
    if (!frameId || typeof frameId !== 'string') return;
    if (!window._natFrames?.equip) return;
    try {
      await window._natFrames.equip(frameId);
      _state.equippedFrame = frameId;
      _dispatch('frame', frameId);
      saveToCloud();
    } catch (e) {
      console.error(LOG, 'equipFrame failed:', e);
    }
  }

  async function unequipFrame() {
    if (!window._natFrames?.unequip) return;
    try {
      await window._natFrames.unequip?.();
      _state.equippedFrame = null;
      _dispatch('frame', null);
      saveToCloud();
    } catch (e) {
      console.error(LOG, 'unequipFrame failed:', e);
    }
  }

  /**
   * Toggle a badge in/out of equipped slots.
   * Max MAX_EQUIPPED_BADGES can be active.
   */
  async function equipBadge(badgeId) {
    if (!badgeId) return;
    const idx = _state.equippedBadges.indexOf(badgeId);
    if (idx !== -1) {
      // Unequip
      _state.equippedBadges.splice(idx, 1);
    } else {
      if (_state.equippedBadges.length >= MAX_EQUIPPED_BADGES) {
        // Drop oldest
        _state.equippedBadges.shift();
      }
      _state.equippedBadges.push(badgeId);
    }
    _dispatch('badges', [..._state.equippedBadges]);
    _mirrorToProfile();
    saveToCloud();
  }

  /**
   * Equip a title by id. Pass null or same id to unequip.
   */
  async function equipTitle(titleId) {
    if (_state.equippedTitle === titleId) {
      _state.equippedTitle = null;
    } else {
      const def = TITLE_REGISTRY.find(t => t.id === titleId);
      if (!def || !_isTitleUnlocked(def)) return;
      _state.equippedTitle = titleId;
    }
    _dispatch('title', _state.equippedTitle);
    _mirrorToProfile();
    saveToCloud();
  }

  async function unequipTitle() {
    _state.equippedTitle = null;
    _dispatch('title', null);
    _mirrorToProfile();
    saveToCloud();
  }

  /* ----------------------------------------------------------
     8. CLOUD SYNC
  ---------------------------------------------------------- */

  async function syncFromCloud(uid) {
    uid = uid || window.currentUID;
    if (!uid) return;

    const ok = await _loadFirestore();
    if (!ok) return;

    try {
      const snap = await _fsLib.getDoc(_profileRef(uid));
      if (!snap.exists()) return;

      const data = snap.data();

      if (data.equippedFrame  != null) _state.equippedFrame  = data.equippedFrame;
      if (Array.isArray(data.equippedBadges)) _state.equippedBadges = data.equippedBadges;
      if (data.equippedTitle  != null) _state.equippedTitle  = data.equippedTitle;
      if (data.ownedFrames)            _state.ownedFrames    = data.ownedFrames;
      if (Array.isArray(data.ownedBadges)) _state.ownedBadges = data.ownedBadges;
      if (data.levelStyle     != null) _state.levelStyle     = data.levelStyle;

      // Seed ownedTitles from unlock logic (titles are auto-unlocked, not stored)
      _state.ownedTitles = TITLE_REGISTRY.filter(_isTitleUnlocked).map(t => t.id);

      _mirrorToProfile();
      _dispatch('sync', getState());
      console.log(LOG, '☁️ Synced from cloud for', uid);
    } catch (e) {
      console.error(LOG, 'syncFromCloud error:', e);
    }
  }

  function saveToCloud(immediate = false) {
    const uid = window.currentUID;
    if (!uid) return;

    clearTimeout(_saveTimer);
    if (!immediate) {
      _saveTimer = setTimeout(() => _doSave(uid), SAVE_DEBOUNCE_MS);
    } else {
      _doSave(uid);
    }
  }

  async function _doSave(uid) {
    const ok = await _loadFirestore();
    if (!ok) return;
    try {
      await _fsLib.setDoc(_profileRef(uid), {
        equippedFrame:  _state.equippedFrame,
        equippedBadges: _state.equippedBadges,
        equippedTitle:  _state.equippedTitle,
        ownedFrames:    _state.ownedFrames,
        ownedBadges:    _state.ownedBadges,
        levelStyle:     _state.levelStyle,
        updatedAt:      _fsLib.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error(LOG, 'saveToCloud error:', e);
    }
  }

  /* ----------------------------------------------------------
     9. HELPERS
  ---------------------------------------------------------- */

  /** Mirror equipped cosmetics into profile.js local state */
  function _mirrorToProfile() {
    // profile.js reads from window._natCosmetics.getState()
    // so nothing extra needed — it polls/listens via the event.
    // But also update any open profile panel immediately:
    window.dispatchEvent(new CustomEvent('nat-cosmetics-change', {
      detail: getState(),
    }));
  }

  function _dispatch(type, value) {
    window.dispatchEvent(new CustomEvent('nat-cosmetics-change', {
      detail: { type, value, state: getState() },
    }));
  }

  /** Map badge anim/rarity to a rarity key */
  function _badgeRarity(badgeDef) {
    if (badgeDef.anim) return 'legendary';
    if ((badgeDef.need || 0) >= 10) return 'epic';
    if ((badgeDef.need || 0) >= 5) return 'rare';
    if ((badgeDef.need || 0) >= 3) return 'uncommon';
    return 'common';
  }

  /** Flatten window.BADGES (if available) into a flat array of defs */
  function _collectAllBadgeDefs() {
    const src = window.BADGES || {};
    const out = [];
    for (const category of Object.values(src)) {
      if (Array.isArray(category)) {
        out.push(...category);
      } else if (typeof category === 'object') {
        // emoji_streaks: { '😍': [...], '😭': [...] }
        for (const arr of Object.values(category)) {
          if (Array.isArray(arr)) out.push(...arr);
        }
      }
    }
    return out;
  }

  /** Populate ownedBadges from profile.js local state snapshot */
  function _seedBadgesFromProfile() {
    try {
      const raw = window._natProfileLocal;
      if (!raw) return;
      if (Array.isArray(raw.equippedBadges)) {
        _state.equippedBadges = [...raw.equippedBadges];
      }
      // All badges in profile that are earned
      if (Array.isArray(raw.ownedBadges)) {
        _state.ownedBadges = [...raw.ownedBadges];
      }
    } catch (_) {}
  }

  /* ----------------------------------------------------------
     10. AUTH WATCHER
  ---------------------------------------------------------- */
  function _watchAuth() {
    const auth = window._natFirebase?.auth;
    if (!auth) return;

    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
      .then(({ onAuthStateChanged }) => {
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            _uid = user.uid;
            _state.ownedTitles = TITLE_REGISTRY.filter(_isTitleUnlocked).map(t => t.id);
            _seedBadgesFromProfile();
            await syncFromCloud(user.uid);
          } else {
            _uid = null;
            _state = {
              equippedFrame: null, equippedBadges: [], equippedTitle: null,
              ownedFrames: {}, ownedBadges: [], ownedTitles: [], levelStyle: null,
            };
          }
        });
      })
      .catch(e => console.error(LOG, 'auth watch error:', e));
  }

  /* ----------------------------------------------------------
     11. INIT
  ---------------------------------------------------------- */
  function _init() {
    const poll = setInterval(() => {
      _initAttempts++;
      const fbReady     = !!window._natFirebase?.auth;
      const framesReady = !!window._natFrames;

      if (fbReady && framesReady) {
        clearInterval(poll);
        _boot();
        return;
      }
      if (_initAttempts >= MAX_INIT) {
        clearInterval(poll);
        console.warn(LOG, 'Init timed out', { fbReady, framesReady });
      }
    }, 100);
  }

  async function _boot() {
    // Patch _natFrames.REGISTRY reference so getFrames() can read it
    if (window._natFrames && !window._natFrames.REGISTRY) {
      // avatar-frames.js keeps registry private; expose via inventory call
      window._natFrames.REGISTRY = {};
      try {
        const inv = await window._natFrames.inventory();
        inv.forEach(({ def }) => {
          if (def?.id) window._natFrames.REGISTRY[def.id] = def;
        });
      } catch (_) {}
    }

    _seedBadgesFromProfile();
    _watchAuth();

    // Immediate sync if already signed in
    const uid = window.currentUID || window._natFirebase?.auth?.currentUser?.uid;
    if (uid) {
      _uid = uid;
      await syncFromCloud(uid);
    }

    _ready = true;
    console.log(LOG, '✅ Cosmetics system ready');
    window.dispatchEvent(new CustomEvent('nat-cosmetics-ready'));
  }

  /* ----------------------------------------------------------
     EXPOSE
  ---------------------------------------------------------- */
  window._natCosmetics = {
    // Data
    RARITY_META,
    TITLE_REGISTRY,
    MAX_EQUIPPED_BADGES,

    // Getters
    getState,
    getFrames,
    getBadges,
    getTitles,

    // Actions
    equipFrame,
    unequipFrame,
    equipBadge,
    equipTitle,
    unequipTitle,

    // Sync
    syncFromCloud,
    saveToCloud,

    // Internal (for inventory-ui.js)
    _isTitleUnlocked,
    _badgeRarity,
  };

  _init();

})();
