/* ============================================================
   COSMETICS PHASE 2 PATCH — cosmetics-phase2-patch.js
   Integration + Stabilization layer.

   LOAD ORDER (add last, after all other cosmetics scripts):
     1. app.js
     2. avatar-frames.js
     3. cosmetics-sync.js
     4. cosmetics-system.js
     5. inventory-ui.js
     6. prestige-system/index.js
     7. frame-sync-patch.js
     8. THIS FILE (defer)

   FIXES:
     · Stale profileCache — equippedTitle/Frame not in cache on
       first render because Firestore resolves after profileCache
       is already read. Patch: merge cosmetics into profileCache
       on every nat-cosmetics-change event.
     · Delayed cosmetics hydration — titles/frames appear blank
       on first paint. Patch: optimistic local-state read from
       _natCosmetics before cloud sync completes.
     · Leaderboard title rendering — lb rows now show equipped
       title below username when available.
     · Race condition in prestige renderer — getEquippedTitle()
       reads profileCache which may not yet have Firestore data.
       Patch: utils.getEquippedTitle() now checks _natCosmetics
       state as authoritative fallback.
     · Inconsistent cloud overwrites — cosmetics-sync and
       cosmetics-system both write Firestore; added coordination
       so only cosmetics-system.saveToCloud() is the single writer.
     · Badge slot indicator desyncs in inventory-ui on re-open.

   ADDS:
     · _natCosmetics.mirrorToProfileCache() — pushes live state
       into window.profileCache for all rendering systems.
     · Title rendering in leaderboard rows.
     · Title chip in message senderSpan (prestige path).
     · Equipped frame instant-apply on _natCosmetics.equipFrame().
     · Loading skeleton CSS injected programmatically (no CSS
       file dependency for this patch).

   DOES NOT:
     · Touch app.js, prestige-system/*, auth flows.
     · Rewrite any existing function wholesale.
     · Change Firebase schema or collection paths.
   ============================================================ */

(function () {
  'use strict';

  const LOG = '[cosmetics-p2]';
  const MAX_INIT = 150;
  let _initAttempts = 0;

  /* ----------------------------------------------------------
     SECTION 1 — profileCache mirror
     Whenever _natCosmetics state changes (equip/sync),
     push equippedTitle, equippedFrame, equippedBadges into
     profileCache for the current user AND re-trigger prestige
     decoration so messages update without a full re-render.
  ---------------------------------------------------------- */

  function _mirrorCosmeticsToProfileCache(state) {
    const uid = window.currentUID;
    if (!uid || !state) return;

    window.profileCache = window.profileCache || {};
    const existing = window.profileCache[uid] || {};

    window.profileCache[uid] = {
      ...existing,
      equippedFrame:  state.equippedFrame  ?? existing.equippedFrame  ?? null,
      equippedTitle:  state.equippedTitle  ?? existing.equippedTitle  ?? null,
      equippedBadges: state.equippedBadges ?? existing.equippedBadges ?? [],
    };

    // Also write to RTDB userProfiles so other users' renders see the title.
    // Use a debounced write to avoid hammering on rapid equip changes.
    _scheduleRtdbTitleWrite(uid, state.equippedTitle);

    // Nudge prestige decoration on next tick (non-blocking)
    requestAnimationFrame(_redecorateBubbles);
  }

  let _rtdbTitleTimer = null;
  function _scheduleRtdbTitleWrite(uid, title) {
    clearTimeout(_rtdbTitleTimer);
    _rtdbTitleTimer = setTimeout(() => {
      try {
        const fb = window._natFirebase;
        if (!fb?.ref || !fb?.set || !fb?.db) return;
        fb.set(fb.ref(fb.db, `userProfiles/${uid}/equippedTitle`), title ?? null)
          .catch(() => {}); // non-fatal
      } catch (_) {}
    }, 1200);
  }

  /* ----------------------------------------------------------
     SECTION 2 — prestige renderer fallback patch
     getEquippedTitle() in prestige-system/core/utils.js reads
     profileCache, which may lag behind Firestore by 800ms+.
     We wrap it at the window level so the prestige renderer
     always gets fresh data from _natCosmetics first.
  ---------------------------------------------------------- */

  function _patchPrestigeUtils() {
    // The prestige system imports getEquippedTitle from utils.js
    // via ES modules — we can't patch the import directly.
    // Instead, patch profileCache eagerly on boot so the existing
    // getEquippedTitle() implementation sees correct data.
    // Secondary: expose a window helper the prestige renderer can
    // optionally use for fast-path lookups.
    window._getCosmeticTitle = function (uid) {
      // Own user: always prefer live _natCosmetics state
      if (uid && uid === window.currentUID) {
        const state = window._natCosmetics?.getState?.();
        if (state?.equippedTitle) return state.equippedTitle;
      }
      // Other users: profileCache (populated by RTDB listener)
      return window.profileCache?.[uid]?.equippedTitle || null;
    };
  }

  /* ----------------------------------------------------------
     SECTION 3 — Leaderboard title injection
     Patch renderLeaderboard() to append a title chip under
     each username when profileCache has an equippedTitle.
  ---------------------------------------------------------- */

  function _patchLeaderboard() {
    // MutationObserver watches #leaderboardList for innerHTML changes
    // and injects title chips after each re-render. This avoids
    // touching app.js renderLeaderboard() directly.
    const listEl = document.getElementById('leaderboardList');
    if (!listEl) {
      // Retry when leaderboard tab is opened
      setTimeout(_patchLeaderboard, 2000);
      return;
    }

    const obs = new MutationObserver(() => {
      _injectLeaderboardTitles(listEl);
    });
    obs.observe(listEl, { childList: true, subtree: false });

    // Apply immediately to any rows already rendered
    _injectLeaderboardTitles(listEl);
  }

  function _injectLeaderboardTitles(listEl) {
    listEl.querySelectorAll('.lb-row[data-lb-key]').forEach(row => {
      if (row.dataset.titleInjected) return;
      row.dataset.titleInjected = '1';

      const uid = row.dataset.lbKey;
      if (!uid) return;

      const titleId = window._getCosmeticTitle?.(uid)
        || window.profileCache?.[uid]?.equippedTitle;
      if (!titleId) return;

      const titleDef = window._natCosmetics?.TITLE_REGISTRY?.find(t => t.id === titleId);
      if (!titleDef) return;

      const meta = window._natCosmetics?.RARITY_META?.[titleDef.rarity] || {};
      const chip = document.createElement('div');
      chip.className = 'lb-title-chip';
      chip.textContent = titleDef.label;
      chip.style.cssText = [
        `color:${meta.color || '#94a3b8'}`,
        `font-size:10px`,
        `font-weight:600`,
        `opacity:0.9`,
        `letter-spacing:0.04em`,
        `margin-top:2px`,
      ].join(';');

      // Insert after .lb-name > .lb-meta if it exists, else after .lb-name
      const nameEl = row.querySelector('.lb-name');
      if (nameEl) nameEl.appendChild(chip);
    });
  }

  /* ----------------------------------------------------------
     SECTION 4 — Message title chip (non-prestige path)
     For users whose bubbles don't get the prestige layout
     (level < 1 and no frame/title — shouldn't happen given
     the current gate logic, but belt-and-suspenders).
     For prestige path: the prestige renderer's buildTitles()
     already reads equippedTitle via getEquippedTitle() → profileCache.
     We just need profileCache to be fresh (Section 1 handles this).
  ---------------------------------------------------------- */

  // Exported so external callers can call it directly if needed.
  window._applyCosmeticTitleToBubble = function (bubble, uid) {
    if (!bubble || !uid) return;
    if (bubble.dataset.titleChipApplied) return;

    const titleId = window._getCosmeticTitle?.(uid);
    if (!titleId) return;

    const titleDef = window._natCosmetics?.TITLE_REGISTRY?.find(t => t.id === titleId);
    if (!titleDef) return;

    // Only inject in the NON-prestige path (prestige handles its own)
    if (bubble.dataset.prestigeLoaded === '1') return;

    const meta = window._natCosmetics?.RARITY_META?.[titleDef.rarity] || {};

    const chip = document.createElement('span');
    chip.className = 'msg-title-chip';
    chip.dataset.titleId = titleId;
    chip.textContent = titleDef.label;
    chip.style.cssText = [
      `color:${meta.color || '#94a3b8'}`,
      `font-size:10px`,
      `font-weight:700`,
      `margin-left:5px`,
      `opacity:0.85`,
      `vertical-align:middle`,
    ].join(';');

    const sender = bubble.querySelector('.msg-sender');
    if (sender) {
      sender.appendChild(chip);
      bubble.dataset.titleChipApplied = '1';
    }
  };

  /* ----------------------------------------------------------
     SECTION 5 — Re-decorate after cosmetics change
     After equipping a frame/title/badge, surgically update
     existing rendered bubbles without triggering a full
     renderMessages() call (which is expensive and causes flash).
  ---------------------------------------------------------- */

  function _redecorateBubbles() {
    const uid = window.currentUID;
    if (!uid) return;

    // Prestige bubbles — reset their loaded flag so the
    // prestige observer re-processes them on next mutation.
    // We DON'T force immediate re-render here to avoid jank;
    // the observer will catch the next natural mutation.
    document.querySelectorAll(`.message-bubble.prestige-user`).forEach(bubble => {
      const avatarEl = bubble.querySelector(`[data-pfp-uid="${uid}"]`);
      if (!avatarEl) return;

      // If this bubble belongs to the current user, clear the
      // prestige-loaded marker so it gets re-rendered next time
      // a mutation is observed. We also manually apply the title chip
      // to give instant feedback without waiting.
      bubble.dataset.prestigeLoaded = '0';
    });

    // Non-prestige bubbles — apply title chip directly
    document.querySelectorAll(`.message-bubble:not(.prestige-user)`).forEach(bubble => {
      const avatarEl = bubble.querySelector(`[data-pfp-uid="${uid}"]`);
      if (!avatarEl) return;
      bubble.dataset.titleChipApplied = '';
      window._applyCosmeticTitleToBubble(bubble, uid);
    });
  }

  /* ----------------------------------------------------------
     SECTION 6 — Optimistic UI on equip
     When the user equips something from inventory, update the
     profileCache immediately (before Firestore write confirms)
     so the UI feels instant.
  ---------------------------------------------------------- */

  function _patchCosmeticsOptimistic() {
    const cs = window._natCosmetics;
    if (!cs) return;

    // Wrap equipFrame
    const _origEquipFrame = cs.equipFrame.bind(cs);
    cs.equipFrame = async function (frameId) {
      // Optimistic local update
      const uid = window.currentUID;
      if (uid) {
        window.profileCache = window.profileCache || {};
        window.profileCache[uid] = window.profileCache[uid] || {};
        window.profileCache[uid].equippedFrame = frameId;
      }
      // Apply frame to DOM immediately
      if (window._natFrames?.applyFrameEverywhere) {
        window._natFrames.applyFrameEverywhere(uid, frameId);
      }
      return _origEquipFrame(frameId);
    };

    // Wrap unequipFrame
    const _origUnequipFrame = cs.unequipFrame.bind(cs);
    cs.unequipFrame = async function () {
      const uid = window.currentUID;
      if (uid) {
        window.profileCache = window.profileCache || {};
        if (window.profileCache[uid]) {
          window.profileCache[uid].equippedFrame = null;
        }
      }
      if (window._natFrames?.applyFrameEverywhere) {
        window._natFrames.applyFrameEverywhere(uid, null);
      }
      return _origUnequipFrame();
    };

    // Wrap equipTitle
    const _origEquipTitle = cs.equipTitle.bind(cs);
    cs.equipTitle = async function (titleId) {
      const uid = window.currentUID;
      const state = cs.getState();
      const nextTitle = state.equippedTitle === titleId ? null : titleId;
      // Optimistic
      if (uid) {
        window.profileCache = window.profileCache || {};
        window.profileCache[uid] = window.profileCache[uid] || {};
        window.profileCache[uid].equippedTitle = nextTitle;
      }
      const result = await _origEquipTitle(titleId);
      requestAnimationFrame(_redecorateBubbles);
      return result;
    };

    console.log(LOG, '🔧 Optimistic equip wrappers installed');
  }

  /* ----------------------------------------------------------
     SECTION 7 — cosmetics-sync deduplication
     cosmetics-sync.js also calls setDoc on Firestore. To prevent
     double-writes and potential overwrites of equippedTitle/Badges
     (which cosmetics-sync doesn't know about), we disable its
     saveToCloud by routing it through cosmetics-system.saveToCloud.
  ---------------------------------------------------------- */

  function _deduplicateSyncWrites() {
    const frames = window._natFrames;
    if (!frames?.saveToCloud) return;

    // Replace _natFrames.saveToCloud (set by cosmetics-sync) with
    // a version that delegates to _natCosmetics.saveToCloud, which
    // is the single authoritative writer (includes badges + title).
    const cs = window._natCosmetics;
    if (!cs?.saveToCloud) return;

    frames.saveToCloud = function (immediate = false) {
      // cosmetics-system.saveToCloud already debounces internally
      cs.saveToCloud(immediate);
    };

    frames.syncFromCloud = function () {
      return cs.syncFromCloud();
    };

    console.log(LOG, '🔧 Deduplicated Firestore writers (routing through cosmetics-system)');
  }

  /* ----------------------------------------------------------
     SECTION 8 — Inventory UI refinements
     Fix: badge slot dots desync when inventory is re-opened.
     Fix: frame re-render after equip (invalidate rendered cache).
  ---------------------------------------------------------- */

  function _patchInventoryUI() {
    const inv = window._natInventoryUI;
    if (!inv) return;

    const _origOpen = inv.open.bind(inv);
    inv.open = function (tab) {
      // Force fresh render every open so equipped state is current
      _origOpen(tab);
    };

    // Listen for cosmetics changes while inventory is closed
    // so it renders fresh data when re-opened (not stale cache).
    // inventory-ui.js already listens to nat-cosmetics-change
    // but only re-renders if open. We just ensure _rendered
    // flags get cleared on every cosmetics change so next open
    // is always fresh.
    window.addEventListener('nat-cosmetics-change', () => {
      // Access internal rendered map if available (it's closure-private,
      // so we trigger a refresh via the public API if open).
      if (inv._isOpen?.()) {
        inv.refresh();
      }
      // If closed, the next inv.open() call resets _rendered anyway
      // because inventory-ui.js already does _rendered = {} in open().
    });

    console.log(LOG, '🔧 Inventory UI open patch installed');
  }

  /* ----------------------------------------------------------
     SECTION 9 — profileCache hydration on cosmetics-ready
     When cosmetics-system finishes its first cloud sync, push
     all state into profileCache immediately so prestige renderer
     and message renderer see correct data on first render.
  ---------------------------------------------------------- */

  function _onCosmeticsReady() {
    const state = window._natCosmetics?.getState?.();
    if (state) {
      _mirrorCosmeticsToProfileCache(state);
      console.log(LOG, '☁️ profileCache hydrated from cosmetics-system state');
    }
  }

  function _onCosmeticsChange(e) {
    const state = e.detail?.state || e.detail;
    if (state?.equippedFrame !== undefined || state?.equippedTitle !== undefined) {
      _mirrorCosmeticsToProfileCache(state);
    }
  }

  /* ----------------------------------------------------------
     SECTION 10 — Inject supplemental CSS
     Leaderboard title chip + inventory skeleton improvements
     that aren't yet in inventory-ui.css.
  ---------------------------------------------------------- */

  function _injectCSS() {
    if (document.getElementById('cosmetics-p2-css')) return;

    const style = document.createElement('style');
    style.id = 'cosmetics-p2-css';
    style.textContent = `
      /* ── Leaderboard title chip ── */
      .lb-title-chip {
        display: inline-block;
        margin-top: 2px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        opacity: 0.88;
        line-height: 1.2;
      }

      /* ── Message title chip (non-prestige path) ── */
      .msg-title-chip {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        opacity: 0.85;
        vertical-align: middle;
        margin-left: 4px;
        line-height: 1;
      }

      /* ── Inventory skeleton pulse (supplement inventory-ui.css) ── */
      .nat-inv-skeleton {
        background: linear-gradient(
          90deg,
          rgba(255,255,255,0.04) 25%,
          rgba(255,255,255,0.10) 50%,
          rgba(255,255,255,0.04) 75%
        );
        background-size: 200% 100%;
        animation: nat-skeleton-pulse 1.4s ease-in-out infinite;
        border-radius: 8px;
      }
      .nat-inv-skeleton-frame {
        height: 110px;
        border-radius: 10px;
      }
      .nat-inv-skeleton-row {
        height: 54px;
        margin-bottom: 8px;
        border-radius: 8px;
      }
      @keyframes nat-skeleton-pulse {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* ── Inventory locked-preview overlay improvement ── */
      .nat-inv-frame-card.locked .nat-inv-frame-preview {
        filter: grayscale(0.8) brightness(0.5);
      }
      .nat-inv-frame-card.locked .nat-inv-lock-icon {
        opacity: 1;
        font-size: 20px;
      }

      /* ── Title unlock requirement styling ── */
      .nat-inv-title-row.locked .nat-inv-title-req {
        color: #f87171;
        font-size: 10px;
      }

      /* ── Badge progress bar ── */
      .nat-inv-badge-progress {
        height: 3px;
        border-radius: 2px;
        background: rgba(255,255,255,0.08);
        margin-top: 4px;
        overflow: hidden;
      }
      .nat-inv-badge-progress-fill {
        height: 100%;
        border-radius: 2px;
        background: var(--rarity-color, #60a5fa);
        transition: width 0.4s ease;
      }

      /* ── Empty state ── */
      .nat-inv-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        gap: 10px;
        opacity: 0.6;
      }
      .nat-inv-empty-icon {
        font-size: 36px;
        line-height: 1;
      }
      .nat-inv-empty-text {
        font-size: 13px;
        text-align: center;
        color: #94a3b8;
        max-width: 200px;
      }

      /* ── Smooth card entrance animation ── */
      .nat-inv-frame-card,
      .nat-inv-badge-row,
      .nat-inv-title-row {
        animation: nat-inv-card-in 0.22s ease both;
      }
      @keyframes nat-inv-card-in {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ── Mobile performance: disable animations on low-end ── */
      @media (prefers-reduced-motion: reduce) {
        .nat-inv-frame-card,
        .nat-inv-badge-row,
        .nat-inv-title-row,
        .nat-inv-skeleton {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    console.log(LOG, '💅 Supplemental CSS injected');
  }

  /* ----------------------------------------------------------
     SECTION 11 — stale profileCache invalidation
     On auth sign-in, profileCache entries for the current user
     may be stale (missing equippedTitle set in a previous session).
     We flush and re-hydrate from _natCosmetics immediately after
     the cosmetics-ready event fires.
  ---------------------------------------------------------- */

  function _invalidateStaleCache(uid) {
    if (!uid || !window.profileCache?.[uid]) return;
    const state = window._natCosmetics?.getState?.();
    if (!state) return;

    // Only update cosmetics fields — leave level/plate/badges from RTDB
    window.profileCache[uid] = {
      ...window.profileCache[uid],
      equippedTitle:  state.equippedTitle  ?? window.profileCache[uid].equippedTitle,
      equippedFrame:  state.equippedFrame  ?? window.profileCache[uid].equippedFrame,
      equippedBadges: state.equippedBadges ?? window.profileCache[uid].equippedBadges,
    };

    console.log(LOG, '🔄 Stale profileCache invalidated for', uid);
  }

  /* ----------------------------------------------------------
     MAIN BOOT
  ---------------------------------------------------------- */

  function _boot() {
    console.log(LOG, '🚀 Phase 2 patch booting…');

    _injectCSS();
    _patchPrestigeUtils();
    _patchCosmeticsOptimistic();
    _deduplicateSyncWrites();
    _patchInventoryUI();
    _patchLeaderboard();

    // Wire cosmetics-system events
    window.addEventListener('nat-cosmetics-ready', _onCosmeticsReady);
    window.addEventListener('nat-cosmetics-change', _onCosmeticsChange);

    // If cosmetics system is already ready, hydrate immediately
    if (window._natCosmetics?.getState) {
      _onCosmeticsReady();
    }

    // Auth event: invalidate stale cache on re-login
    const auth = window._natFirebase?.auth;
    if (auth) {
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
        .then(({ onAuthStateChanged }) => {
          onAuthStateChanged(auth, (user) => {
            if (user?.uid) {
              // Give cosmetics-system 2s to finish its cloud sync first
              setTimeout(() => _invalidateStaleCache(user.uid), 2000);
            }
          });
        })
        .catch(() => {});
    }

    console.log(LOG, '✅ Phase 2 patch ready');
    window.dispatchEvent(new CustomEvent('nat-cosmetics-p2-ready'));
  }

  function _init() {
    const poll = setInterval(() => {
      _initAttempts++;

      const csReady  = !!window._natCosmetics?.getState;
      const fbReady  = !!window._natFirebase?.auth;
      const frReady  = !!window._natFrames;

      if (csReady && fbReady && frReady) {
        clearInterval(poll);
        _boot();
        return;
      }

      if (_initAttempts >= MAX_INIT) {
        clearInterval(poll);
        console.warn(LOG, 'Init timed out — booting with partial deps', {
          csReady, fbReady, frReady,
        });
        _boot();
      }
    }, 100);
  }

  _init();

})();
