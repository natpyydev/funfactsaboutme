/* ============================================================
   FRAME SYNC PATCH — frame-sync-patch.js

   PURPOSE:
     Adds window._natFrames.applyFrameEverywhere(uid, frameId)
     — a MutationObserver-safe helper that applies avatar frames
     to every [data-pfp-uid] element in the DOM for a given uid
     WITHOUT re-rendering messages, creating duplicate listeners,
     or polling aggressively.

   ALSO CONFIRMS:
     app.js line 1518 already emits:
       <div class="msg-pfp-avatar" data-pfp-uid="${m.uid || ''}">
     No change to the message template is required.

   LOAD ORDER in index.html (add after cosmetics-sync.js):
     <script defer src="frame-sync-patch.js"></script>

   DEPENDS ON:
     window._natFrames  (avatar-frames.js must run first)
     window._natFirebase (app.js must run first)

   PUBLIC API ADDED:
     window._natFrames.applyFrameEverywhere(uid, frameId)
       → Applies frameId to every [data-pfp-uid="${uid}"] element
         currently in the DOM. Skips elements that already have
         the correct frame. GPU-safe via IntersectionObserver
         passthrough. Mobile-safe — uses requestAnimationFrame
         batching to avoid layout thrash.
   ============================================================ */

(function () {
  'use strict';

  const LOG          = '[frameSyncPatch]';
  const MAX_ATTEMPTS = 80;   // 8 s @ 100 ms
  let   _attempts    = 0;

  /* ----------------------------------------------------------
     AUDIT COMMENT (no code change needed):

     app.js renderMessage() already emits:
       <div class="msg-pfp-avatar" data-pfp-uid="${m.uid || ''}">

     avatar-frames.js MutationObserver (_initMutationObserver)
     already watches for new [data-pfp-uid] elements and calls
     _handleNewAvatarEl → _subscribeFrameForUID → applyFrameToUID.

     The gap was that:
       1. cosmetics-sync.js _applyFrameEverywhere() calls
          _natFrames.applyUID() (which exists as applyFrameToUID),
          so the sync restore path is already wired.
       2. No *public* applyFrameEverywhere helper existed for
          external callers or for safe re-application after
          partial DOM updates.

     This patch closes that gap.
  ---------------------------------------------------------- */

  /* ----------------------------------------------------------
     CORE HELPER: applyFrameEverywhere(uid, frameId)

     Targets ONLY [data-pfp-uid="${uid}"] elements.
     Skips elements that already show the correct frame.
     Uses rAF batching so it never causes mid-paint layout thrash.
     Safe to call from MutationObserver callbacks, auth listeners,
     or any async context.
  ---------------------------------------------------------- */
  function applyFrameEverywhere(uid, frameId) {
    if (!uid) return;

    // Normalise: null / undefined / '' all mean "remove frame"
    const targetFrame = frameId || null;

    // Collect all avatar elements for this uid in one query
    const elements = document.querySelectorAll(
      `[data-pfp-uid="${CSS.escape(uid)}"]`
    );

    if (!elements.length) return;

    // Batch DOM writes in a single rAF to avoid layout thrash
    // and stay mobile-safe (avoids forced reflow on scroll)
    requestAnimationFrame(() => {
      elements.forEach(el => {
        // ── Skip-if-correct guard ────────────────────────────
        // Check the first .nat-frame child's data-frame-id.
        // If it already matches, skip — prevents redundant
        // DOM mutations that would confuse the MutationObserver.
        const existingFrame = el.querySelector('.nat-frame');
        const currentFrameId = existingFrame
          ? existingFrame.dataset.frameId || null
          : null;

        if (currentFrameId === targetFrame) return; // already correct

        // ── Apply via the core engine ────────────────────────
        // _natFrames.apply() handles remove-then-inject cleanly
        // and registers with the IntersectionObserver for GPU savings.
        window._natFrames.apply(el, targetFrame);
      });

      // Keep the runtime cache consistent so future calls to
      // applyUID / applyFrameEverywhere agree on current state.
      if (window._natFrames.cache) {
        window._natFrames.cache[uid] = targetFrame;
      }
    });
  }


  /* ----------------------------------------------------------
     EXPOSE ON window._natFrames
     Also patch cosmetics-sync's internal _applyFrameEverywhere
     to route through this same logic (they both call applyUID
     already, but this makes the sync path use the skip guard too).
  ---------------------------------------------------------- */
  function _patchFramesEngine() {
    const engine = window._natFrames;
    if (!engine) return false;

    // Guard: only patch once
    if (engine.applyFrameEverywhere) {
      console.log(LOG, 'applyFrameEverywhere already present — skipping patch');
      return true;
    }

    // Attach the new helper
    engine.applyFrameEverywhere = applyFrameEverywhere;

    // Also ensure applyUID (cosmetics-sync's restore path) uses
    // the same rAF-batched, skip-aware logic for consistency.
    // We do this by wrapping applyUID rather than replacing it,
    // so the existing RTDB subscription path still works.
    const _originalApplyUID = engine.applyUID.bind(engine);
    engine.applyUID = function patchedApplyUID(uid, frameId) {
      // Run the original (updates cache + applies immediately via forEach)
      _originalApplyUID(uid, frameId);
      // Then ensure any elements the original might have missed
      // (e.g. elements added between the original query and now)
      // are also caught — safe because of the skip-if-correct guard.
      applyFrameEverywhere(uid, frameId);
    };

    console.log(LOG, '✅ applyFrameEverywhere patched onto window._natFrames');
    return true;
  }


  /* ----------------------------------------------------------
     INIT — poll until _natFrames is ready, then patch
  ---------------------------------------------------------- */
  function _init() {
    const poll = setInterval(() => {
      _attempts++;

      if (window._natFrames?.apply && window._natFrames?.applyUID) {
        clearInterval(poll);
        _patchFramesEngine();

        // Re-apply frames for any already-authenticated user
        // in case this script loads after auth resolved.
        const uid = window.currentUID;
        if (uid && window._natFrames.cache?.[uid]) {
          applyFrameEverywhere(uid, window._natFrames.cache[uid]);
        }
        return;
      }

      if (_attempts >= MAX_ATTEMPTS) {
        clearInterval(poll);
        console.warn(LOG, 'Timed out waiting for _natFrames');
      }
    }, 100);
  }

  _init();

})();
