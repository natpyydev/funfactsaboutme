/**
 * core/renderer.js
 *
 * Orchestrates the full prestige layout build for a single bubble.
 *
 * Responsibilities:
 *   - Extract raw source elements from the original bubble DOM
 *   - Call each module to build its section
 *   - Assemble left column + right column + outer wrap
 *   - Atomically replace bubble.innerHTML once with the finished tree
 *   - Apply post-render effects (mythic glow, VIP bar class)
 *
 * This file intentionally contains NO styling logic.
 * Each visual section is owned entirely by its module.
 */

'use strict';

import { el, appendAll, qs, getLevel, getEquippedTitle, isMythicFrame, isVIP, warn, err } from './utils.js';

import { buildLevelGem }    from '../modules/levelGem.js';
import { buildUsernameRow } from '../modules/usernameRow.js';
import { buildTitles }      from '../modules/titles.js';
import { buildBadges }      from '../modules/badges.js';
import { buildReactions }   from '../modules/reactions.js';
import { buildActionRow }   from '../modules/actionRow.js';
import { buildParticles }   from '../modules/particles.js';
import { applyVipEffects }  from '../modules/vipEffects.js';

/* ============================================================
   SCHEDULING — rAF-based single-frame rendering
   Each bubble is rendered inside requestAnimationFrame so the
   browser never blocks mid-layout-tree on a synchronous DOM write.
   ============================================================ */

const scheduled = new WeakSet();

export function scheduleBubble(bubble) {
  if (scheduled.has(bubble)) return;
  scheduled.add(bubble);

  requestAnimationFrame(() => {
    // By the time rAF fires the bubble may have already been
    // processed by a synchronous call (e.g. initial scan)
    if (bubble.dataset.prestigeLoaded === '1') return;
    renderBubble(bubble);
  });
}

/* ============================================================
   MAIN RENDER FUNCTION
   ============================================================ */

export function renderBubble(bubble) {
  if (!bubble) return;
  if (bubble.dataset.prestigeLoaded === '1') return;

  // Mark early so re-entrant observer calls are dropped
  bubble.dataset.prestigeLoaded = '1';

  /* ----------------------------------------------------------
     1. EXTRACT source elements from original DOM
        Do all reads BEFORE any writes to avoid forced reflows.
     ---------------------------------------------------------- */
  const avatar   = qs(bubble, '.msg-pfp-wrap') || qs(bubble, '.msg-pfp-avatar');
  const textEl   = qs(bubble, '.msg-text');
  const meta     = qs(bubble, '.msg-meta');
  const badgeRow = qs(bubble, '.msg-badges-row');
  const senderSpan = meta ? qs(meta, '.msg-sender') : null;
  const timeSpan   = meta ? qs(meta, '.msg-time')   : null;

  if (!avatar || !textEl) {
    warn('renderBubble: missing required elements (avatar/text) — skipping', bubble);
    // Reset flag so a later retry can try again if DOM populates slowly
    bubble.dataset.prestigeLoaded = '0';
    return;
  }

  const uid          = avatar.dataset.pfpUid || '';
  const level        = getLevel(uid);
  const equippedTitle = getEquippedTitle(uid);

  /* ----------------------------------------------------------
     2. BUILD LEFT COLUMN
        Avatar (moved, not cloned) + Level Gem
     ---------------------------------------------------------- */
  const leftCol = el('div', 'msg-prestige-left');

  // Move the real avatar — not a clone, so event listeners survive
  leftCol.appendChild(avatar);

  const gem = buildLevelGem(level);
  if (gem) leftCol.appendChild(gem);

  /* ----------------------------------------------------------
     3. BUILD RIGHT COLUMN — assembled top-to-bottom
     ---------------------------------------------------------- */
  const rightCol = el('div', 'msg-prestige-right');

  // 3a. Username + inline badges + time
  const usernameRow = buildUsernameRow(senderSpan, timeSpan);
  rightCol.appendChild(usernameRow);

  // 3b. Title / Legend labels
  const titlesEl = buildTitles(equippedTitle, level);
  if (titlesEl) rightCol.appendChild(titlesEl);

  // 3c. Badge rows (original badges + elite computed badges)
  const badgesEl = buildBadges(uid, badgeRow);
  if (badgesEl) rightCol.appendChild(badgesEl);

  // 3d. Message text (moved, not cloned)
  rightCol.appendChild(textEl);

  // 3e. Reactions (moved, not cloned)
  const reactionsEl = buildReactions(bubble);
  if (reactionsEl) rightCol.appendChild(reactionsEl);

  // 3f. Action row (reply / upvote / delete / pin)
  const actionRow = buildActionRow(bubble);
  rightCol.appendChild(actionRow);

  /* ----------------------------------------------------------
     4. OUTER WRAP
     ---------------------------------------------------------- */
  const wrap = el('div', 'msg-prestige-wrap');
  appendAll(wrap, leftCol, rightCol);

  // Ambient particles layer (absolutely positioned, pointer-events:none)
  const particles = buildParticles();
  if (particles) wrap.appendChild(particles);

  /* ----------------------------------------------------------
     5. POST-BUILD EFFECTS  (class/attribute mutations only)
     ---------------------------------------------------------- */
  applyVipEffects(bubble, wrap, uid, level);

  if (isMythicFrame(uid)) {
    bubble.classList.add('mythic-glow');
  }

  /* ----------------------------------------------------------
     6. ATOMIC DOM REPLACEMENT
        Clear then append in one synchronous block so the browser
        never shows a partially-built layout.
        Using a DocumentFragment avoids an intermediate blank frame.
     ---------------------------------------------------------- */
  const frag = document.createDocumentFragment();
  frag.appendChild(wrap);

  try {
    bubble.innerHTML = '';
    bubble.appendChild(frag);
  } catch (e) {
    err('renderBubble: final append failed', e, bubble);
  }
}
