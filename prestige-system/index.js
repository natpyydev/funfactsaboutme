/**
 * index.js — Prestige System Entry Point
 *
 * Wires observer → renderer → modules together.
 * This is the only file that should be <script>-tagged in index.html.
 *
 * Public API (on window for legacy compatibility):
 *   window.applyPrestigeLayout(bubble)   — render one bubble immediately
 *   window.initPrestigeSystem()          — start the observer
 *   window._prestigeDebug = true         — enable verbose logging before load
 */

'use strict';

import { injectLayoutTokens } from './core/layout.js';
import { init as initObserver } from './core/observer.js';
import { renderBubble } from './core/renderer.js';

/* ============================================================
   BOOT
   ============================================================ */

function boot() {
  // 1. Write CSS custom property tokens to :root so CSS can
  //    reference --prestige-* variables without duplicating values
  injectLayoutTokens();

  // 2. Start the MutationObserver (polls until globals ready)
  initObserver();

  // 3. Scan for any prestige bubbles already in the DOM
  //    (handles cases where messages loaded before this script ran)
  setTimeout(() => {
    document
      .querySelectorAll('.message-bubble.prestige-user')
      .forEach(b => {
        if (b.dataset.prestigeLoaded !== '1') {
          renderBubble(b);
        }
      });
  }, 1500);
}

/* ============================================================
   PUBLIC API  (window exports for legacy callers)
   ============================================================ */

window.applyPrestigeLayout  = renderBubble;
window.initPrestigeSystem   = initObserver;

/* ============================================================
   ENTRY
   ============================================================ */

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  // Already interactive or complete
  boot();
}
