/**
 * core/observer.js
 *
 * Owns the MutationObserver lifecycle.
 *
 * Responsibilities:
 *   - Watch #messagesList for new prestige bubbles
 *   - Debounce/batch rapid mutations (e.g. bulk message renders)
 *   - Guard against re-processing already-decorated bubbles
 *   - Retry init until required globals are available
 *   - Export clean start/stop API for hot-reload or testing
 *
 * Does NOT render anything — calls renderer.scheduleBubble().
 */

'use strict';

import { PRESTIGE_SELECTOR, PRESTIGE_LOADED_ATTR, MESSAGES_LIST_ID, warn, log } from './utils.js';
import { scheduleBubble } from './renderer.js';

/* ============================================================
   INTERNAL STATE
   ============================================================ */

let observer     = null;
let flushTimer   = null;
const queue      = new Set();   // bubbles waiting to be rendered
const FLUSH_MS   = 32;          // ~2 frames — batches burst mutations
const MAX_INIT_ATTEMPTS = 60;   // 6 s at 100 ms intervals

/* ============================================================
   QUEUE + FLUSH
   Batching prevents thrashing when many messages are injected
   at once (initial load, scroll-back, room join).
   ============================================================ */

function enqueue(bubble) {
  // Already rendered — skip entirely
  if (bubble.dataset.prestigeLoaded === '1') return;

  queue.add(bubble);

  // Schedule a flush if one isn't already pending
  if (flushTimer === null) {
    flushTimer = setTimeout(flush, FLUSH_MS);
  }
}

function flush() {
  flushTimer = null;

  // Snapshot and clear immediately so re-entrant mutations
  // that fire during rendering go into a fresh queue
  const pending = Array.from(queue);
  queue.clear();

  pending.forEach(bubble => {
    // Double-check: another flush or direct call may have beaten us
    if (bubble.dataset.prestigeLoaded === '1') return;
    // Guard: element must still be in the document
    if (!document.contains(bubble)) return;

    scheduleBubble(bubble);
  });
}

/* ============================================================
   MUTATION HANDLER
   ============================================================ */

function handleMutations(mutations) {
  for (const mut of mutations) {
    for (const node of mut.addedNodes) {
      if (node.nodeType !== 1) continue;  // skip text/comment nodes

      if (node.matches(PRESTIGE_SELECTOR)) {
        enqueue(node);
      } else {
        // Could be a wrapper div containing prestige bubbles
        node.querySelectorAll?.(PRESTIGE_SELECTOR).forEach(enqueue);
      }
    }
  }
}

/* ============================================================
   OBSERVER LIFECYCLE
   ============================================================ */

function startObserving(list) {
  // Process any prestige bubbles already in the DOM
  list.querySelectorAll(PRESTIGE_SELECTOR).forEach(enqueue);

  observer = new MutationObserver(handleMutations);

  observer.observe(list, {
    childList: true,
    subtree:   true,
    // We don't need attribute or characterData changes —
    // tightest possible observation for best performance
  });

  log('observer started on', list);
}

export function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  queue.clear();
  log('observer stopped');
}

/* ============================================================
   INIT — waits for required globals then starts
   ============================================================ */

export function init() {
  const list = document.getElementById(MESSAGES_LIST_ID);

  if (!list) {
    warn('messagesList not found — observer not started');
    return;
  }

  // Required globals: avatar frame registry + pfp system
  const ready = () => window._natPfp && window._natFrames;

  if (ready()) {
    startObserving(list);
    return;
  }

  // Poll until ready or timeout
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (ready()) {
      clearInterval(timer);
      startObserving(list);
    } else if (attempts >= MAX_INIT_ATTEMPTS) {
      clearInterval(timer);
      warn('timed out waiting for _natPfp/_natFrames — starting anyway');
      startObserving(list);
    }
  }, 100);
}
