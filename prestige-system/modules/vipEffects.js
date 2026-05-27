/**
 * modules/vipEffects.js
 *
 * Applies VIP/dev visual class mutations to a prestige bubble.
 * Pure attribute/class mutations — no new elements created.
 * Called after the full DOM tree is built but before final append.
 */

'use strict';

import { isVIP, isAdmin } from '../core/utils.js';

/**
 * @param {Element} bubble  — original bubble element (for class mutation)
 * @param {Element} wrap    — prestige wrap element
 * @param {string}  uid
 * @param {number}  level
 */
export function applyVipEffects(bubble, wrap, uid, level) {
  if (!uid) return;

  const vip = isVIP(uid);
  const dev = isAdmin(uid);

  if (dev) {
    bubble.classList.add('prestige-dev');
    wrap.classList.add('prestige-dev-wrap');
  } else if (vip) {
    bubble.classList.add('prestige-vip');
    wrap.classList.add('prestige-vip-wrap');
  }

  if (level >= 99) {
    bubble.classList.add('prestige-max-level');
  } else if (level >= 80) {
    bubble.classList.add('prestige-ascended');
  } else if (level >= 60) {
    bubble.classList.add('prestige-cosmic');
  }
}
