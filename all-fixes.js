/**
 * all-fixes.js
 * Consolidated patch for all 8 bugs.
 * Load this AFTER all other scripts (last <script> before </body>).
 *
 *  Fix 1 — isAdmin() also accepts role='dev' from localStorage (roles.js)
 *  Fix 2 — Frame overflow patched at runtime (+ see all-fixes.css)
 *  Fix 3 — Changing PFP busts _pfpCache so past messages refresh
 *  Fix 4 — grantFrame() also writes to Firestore so other devices sync
 *  Fix 5 — Music/settings toggle persists collapsed state; widget is idempotent
 *  Fix 6 — (see notes at bottom — file-level changes documented)
 *  Fix 7 — Titles show at level 99+; re-renders on profileCache update
 *  Fix 8 — msg-level-gem aliased to prestige-gem styles; Orbitron font loaded
 */

(function patchAllFixes() {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────
   * FIX 1 — isAdmin() role check
   * Allows accounts whose localStorage natnat_role === 'dev'
   * to pass isAdmin() even if their UID isn't hardcoded.
   * ───────────────────────────────────────────────────────────────── */
  (function patchIsAdmin() {
    const ROLE_KEY = 'natnat_role';

    function waitFor(getter, cb, maxMs = 8000) {
      const start = Date.now();
      (function attempt() {
        const val = getter();
        if (val) return cb(val);
        if (Date.now() - start > maxMs) return;
        setTimeout(attempt, 120);
      })();
    }

    // We patch window._natDB.isAdmin which is the public surface used everywhere.
    waitFor(() => window._natDB?.isAdmin, (origIsAdmin) => {
      window._natDB.isAdmin = function patchedIsAdmin(uid) {
        if (origIsAdmin.call(window._natDB, uid)) return true;
        // Also allow if this UID is the current user AND they have role 'dev'
        const currentUID = window._natDB?.getUID?.();
        if (uid && uid === currentUID) {
          const role = localStorage.getItem(ROLE_KEY);
          if (role === 'dev') return true;
        }
        return false;
      };
      console.log('[all-fixes] Fix 1 applied: isAdmin role-check patched');
    });
  })();


  /* ─────────────────────────────────────────────────────────────────
   * FIX 2 — Frame overflow on themes (runtime reinforcement)
   * The CSS file handles most of this, but we also do a live DOM pass
   * to fix any .nat-frame-host elements already in the page.
   * ───────────────────────────────────────────────────────────────── */
  (function patchFrameOverflow() {
    function fixHostOverflow() {
      document.querySelectorAll('.nat-frame-host').forEach(el => {
        el.style.overflow = 'visible';
      });
    }

    // Run once on load and again after theme switches
    fixHostOverflow();
    document.addEventListener('theme-changed', fixHostOverflow);

    // MutationObserver catches dynamically added frame hosts
    const obs = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.classList?.contains('nat-frame-host')) {
            node.style.overflow = 'visible';
          }
          node.querySelectorAll?.('.nat-frame-host').forEach(el => {
            el.style.overflow = 'visible';
          });
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Also fix the .message-bubble overflow:hidden that clips chat frames
    // We override it to overflow:visible via the CSS file; here we just
    // ensure any inline style overrides are also cleared.
    document.querySelectorAll('.message-bubble').forEach(el => {
      if (el.style.overflow === 'hidden') el.style.overflow = '';
    });

    console.log('[all-fixes] Fix 2 applied: frame overflow observer active');
  })();


  /* ─────────────────────────────────────────────────────────────────
   * FIX 3 — PFP cache bust on profile save
   * Hooks the 'profile-saved' CustomEvent dispatched by profile.js.
   * ───────────────────────────────────────────────────────────────── */
  (function patchPfpCacheBust() {
    window.addEventListener('profile-saved', (e) => {
      const uid = e.detail?.uid;
      if (!uid || !window._natPfp?.cache) return;

      // Delete cached entry so next fetch is fresh
      delete window._natPfp.cache[uid];

      // Re-fetch & re-apply to every avatar already in the DOM
      document.querySelectorAll(`[data-pfp-uid="${CSS.escape(uid)}"]`).forEach(() => {
        // _natPfp.fetch handles the re-apply internally
        window._natPfp.fetch?.(uid);
      });

      console.log('[all-fixes] Fix 3: pfp cache busted for', uid);
    });
    console.log('[all-fixes] Fix 3 applied: pfp cache-bust listener registered');
  })();


  /* ─────────────────────────────────────────────────────────────────
   * FIX 4 — grantFrame also syncs to Firestore
   * Wraps window._natFrames.grant so every unlock is persisted to
   * Firestore (via saveToCloud) in addition to RTDB.
   * ───────────────────────────────────────────────────────────────── */
  (function patchGrantFrameCloudSync() {
    function waitFor(getter, cb, maxMs = 10000) {
      const start = Date.now();
      (function attempt() {
        const val = getter();
        if (val) return cb(val);
        if (Date.now() - start > maxMs) return;
        setTimeout(attempt, 200);
      })();
    }

    waitFor(() => window._natFrames?.grant, (origGrant) => {
      window._natFrames.grant = async function patchedGrant(frameId, source) {
        await origGrant.call(window._natFrames, frameId, source);
        // After RTDB write, also push to Firestore so other browsers sync
        if (window._natFrames?.saveToCloud) {
          window._natFrames.saveToCloud();
          console.log('[all-fixes] Fix 4: saveToCloud() called after grantFrame', frameId);
        }
      };
      console.log('[all-fixes] Fix 4 applied: grantFrame → Firestore sync patched');
    });

    // Also ensure syncFromCloud runs after _natFrames is fully ready
    waitFor(() => window._natFrames?.syncFromCloud && window._natDB?.getUID?.(), () => {
      const uid = window._natDB.getUID();
      if (uid) {
        window._natFrames.syncFromCloud(uid).then(() => {
          console.log('[all-fixes] Fix 4: syncFromCloud() re-run after init for uid', uid);
        });
      }
    });
  })();


  /* ─────────────────────────────────────────────────────────────────
   * FIX 5 — Music/settings widget: idempotent init + persistent state
   * ───────────────────────────────────────────────────────────────── */
  (function patchMusicWidget() {
    const MU_KEY = 'mu-collapsed';

    function applyMusicTogglePatch() {
      const w = document.getElementById('musicWidget');
      if (!w || w._togglePatched) return;
      w._togglePatched = true;

      const btn = w.querySelector('.mu-toggle');
      if (!btn) return;

      // Always start collapsed on page load/refresh — never re-open automatically
      w.classList.add('collapsed');
      localStorage.removeItem(MU_KEY); // clear any stale open state

      // Replace onclick — no need to persist open state
      btn.onclick = () => {
        w.classList.toggle('collapsed');
      };

      console.log('[all-fixes] Fix 5: music widget toggle patched');
    }

    // Apply when widget appears (may be created after this script runs)
    applyMusicTogglePatch();
    const obs = new MutationObserver(() => applyMusicTogglePatch());
    obs.observe(document.body, { childList: true, subtree: true });
    console.log('[all-fixes] Fix 5 applied: music widget observer active');
  })();


  /* ─────────────────────────────────────────────────────────────────
   * FIX 7 — Titles show at level 99; re-render on profileCache update
   *
   * The original buildTitles() in prestige-system/modules/titles.js
   * has:  if (equippedTitleId && level < 99)
   * which silently hides titles for max-level users.
   * We patch the renderer that calls buildTitles() to pass an
   * overridden level that never suppresses titles.
   * ───────────────────────────────────────────────────────────────── */
  (function patchTitlesLevel99() {
    function waitFor(getter, cb, maxMs = 10000) {
      const start = Date.now();
      (function attempt() {
        const val = getter();
        if (val) return cb(val);
        if (Date.now() - start > maxMs) return;
        setTimeout(attempt, 200);
      })();
    }

    // Patch the prestige system's buildTitles export if accessible
    waitFor(() => window._prestigeSystem?.modules?.titles?.buildTitles, (origBuild) => {
      window._prestigeSystem.modules.titles.buildTitles = function patchedBuildTitles(equippedTitleId, level) {
        // Never suppress title for level >= 99; clamp to 98 for title-display purposes only
        const effectiveLevel = Math.min(level, 98);
        return origBuild(equippedTitleId, effectiveLevel);
      };
      console.log('[all-fixes] Fix 7 applied: buildTitles level-99 gate removed');
    });

    // Re-render titles on any existing messages when profileCache updates
    window.addEventListener('profile-cache-updated', (e) => {
      const uid = e.detail?.uid;
      if (!uid) return;
      document.querySelectorAll(`.msg-prestige-titles[data-uid="${CSS.escape(uid)}"]`)
        .forEach(el => {
          const bubble = el.closest('.message-bubble');
          // Signal the prestige renderer to re-run for this bubble
          bubble?.dispatchEvent(new CustomEvent('prestige-rerender', { bubbles: false }));
        });
    });

    // Fallback: dispatch profile-cache-updated whenever profile-saved fires
    window.addEventListener('profile-saved', (e) => {
      const uid = e.detail?.uid;
      if (uid) {
        window.dispatchEvent(new CustomEvent('profile-cache-updated', { detail: { uid } }));
      }
    });

    console.log('[all-fixes] Fix 7 applied: title re-render listener registered');
  })();


  /* ─────────────────────────────────────────────────────────────────
   * FIX 8 — msg-level-gem class alias
   * The JS creates elements with class "msg-level-gem" but CSS only
   * defines ".prestige-gem". We add the alias at runtime.
   * (Full CSS fix is also in all-fixes.css.)
   * ───────────────────────────────────────────────────────────────── */
  (function patchLevelGemClass() {
    function fixExistingGems() {
      document.querySelectorAll('.msg-level-gem:not(.prestige-gem)').forEach(el => {
        el.classList.add('prestige-gem');
      });
    }

    fixExistingGems();

    const obs = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.classList?.contains('msg-level-gem') && !node.classList.contains('prestige-gem')) {
            node.classList.add('prestige-gem');
          }
          node.querySelectorAll?.('.msg-level-gem:not(.prestige-gem)').forEach(el => {
            el.classList.add('prestige-gem');
          });
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    console.log('[all-fixes] Fix 8 applied: msg-level-gem → prestige-gem alias active');
  })();

  console.log('[all-fixes] All patches loaded ✅');
})();


/* ─────────────────────────────────────────────────────────────────
 * FIX 6 — DUPLICATE FILES (action required — not patchable at runtime)
 *
 * The following files should be cleaned up manually:
 *
 * DELETE (superseded):
 *   - avatar-fix.js          → all unique logic is in avatar-frames/avatar-frames.js
 *   - frame-sync-patch.js    → fully superseded by cosmetics-sync.js
 *   - patch-four-fixes.js    → merge any remaining unique logic into relevant modules,
 *                              then delete
 *   - cosmetics-phase2-patch.js → merge into cosmetics-system.js (after auditing
 *                                  any monkey-patches not yet in the core)
 *
 * MERGE into style.css then DELETE:
 *   - css/all-patches.css
 *   - style-new.css
 *
 * AUDIT (may be safe to delete):
 *   - registry-normalizer.js → check if cosmetics-system.js already covers this
 *
 * KEEP:
 *   - cosmetics-sync.js      → cloud sync layer, keep separate
 *   - cosmetics-system.js    → core system, keep
 *   - cosmetics-renderer.js  → renderer, keep
 * ───────────────────────────────────────────────────────────────── */
