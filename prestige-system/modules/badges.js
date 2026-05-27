/**
 * modules/badges.js
 *
 * Owns two badge systems:
 *
 *   1. ORIGINAL BADGES — the .msg-badges-row from the source DOM,
 *      cloned and sanitised (reaction buttons stripped).
 *
 *   2. ELITE BADGES — computed from profile data (DEV, VIP, MYTHIC,
 *      OG, BETA). These are NEW elements, never cloned.
 *
 * Returns a DocumentFragment containing both sections,
 * or null if there is nothing to render.
 */

'use strict';

import { el, isAdmin, isVIP, isMythicFrame, getProfile } from '../core/utils.js';

/* ============================================================
   ELITE BADGE DEFINITIONS
   Add new badge types here — no changes needed elsewhere.
   ============================================================ */

const ELITE_BADGE_DEFS = [
  {
    id:        'dev',
    label:     'DEV',
    className: 'elite-badge--dev',
    test:      (uid) => isAdmin(uid),
  },
  {
    id:        'vip',
    label:     'VIP',
    className: 'elite-badge--vip',
    test:      (uid) => isVIP(uid),
  },
  {
    id:        'mythic',
    label:     'MYTHIC',
    className: 'elite-badge--mythic',
    test:      (uid) => isMythicFrame(uid),
  },
  {
    id:        'og',
    label:     'OG',
    className: 'elite-badge--og',
    test:      (uid) => Boolean(getProfile(uid).og),
  },
  {
    id:        'beta',
    label:     'BETA',
    className: 'elite-badge--beta',
    test:      (uid) => Boolean(getProfile(uid).beta),
  },
];

/* ============================================================
   PUBLIC API
   ============================================================ */

/**
 * @param {string}       uid       — user ID for elite badge lookup
 * @param {Element|null} badgeRow  — original .msg-badges-row element
 * @returns {DocumentFragment|null}
 */
export function buildBadges(uid, badgeRow) {
  const frag = document.createDocumentFragment();
  let hasContent = false;

  // 1. Original badge row
  const originalSection = buildOriginalBadges(badgeRow);
  if (originalSection) {
    frag.appendChild(originalSection);
    hasContent = true;
  }

  // 2. Elite computed badges
  const eliteSection = buildEliteBadges(uid);
  if (eliteSection) {
    frag.appendChild(eliteSection);
    hasContent = true;
  }

  return hasContent ? frag : null;
}

/* ============================================================
   ORIGINAL BADGES
   ============================================================ */

function buildOriginalBadges(badgeRow) {
  if (!badgeRow) return null;

  const clone = badgeRow.cloneNode(true);

  // Purge reaction buttons that don't belong in the badge row
  const UNWANTED = [
    '.reaction-pill',
    '.msg-reaction',
    '.reaction-btn',
    '.msg-reactions-row',
  ];
  clone.querySelectorAll(UNWANTED.join(',')).forEach(el => {
    el.parentNode?.removeChild(el);
  });

  // If nothing remains after purge, skip the row
  if (!clone.children.length) return null;

  // Reset inline styles so the prestige layout controls the display
  clone.style.cssText = [
    'display:flex',
    'flex-wrap:wrap',
    'gap:6px',
    'margin-top:8px',
    'overflow:visible',
  ].join(';');

  // Hide the original so it doesn't render twice
  badgeRow.style.display = 'none';

  return clone;
}

/* ============================================================
   ELITE BADGES
   ============================================================ */

function buildEliteBadges(uid) {
  if (!uid) return null;

  const earned = ELITE_BADGE_DEFS.filter(def => {
    try { return def.test(uid); }
    catch { return false; }
  });

  if (!earned.length) return null;

  const container = el('div', 'msg-elite-badges');

  earned.forEach(def => {
    const badge = el('span', `elite-badge ${def.className}`);
    badge.textContent = def.label;
    container.appendChild(badge);
  });

  return container;
}
