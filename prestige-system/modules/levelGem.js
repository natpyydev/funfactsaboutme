/**
 * modules/levelGem.js
 *
 * Builds the level gem badge shown below the avatar in prestige layout.
 * Returns null for level 0 (unknown / not loaded yet).
 */

'use strict';

import { el, getTier } from '../core/utils.js';

/**
 * @param {number} level
 * @returns {HTMLElement|null}
 */
export function buildLevelGem(level) {
  if (!level || level < 1) return null;

  const tier  = getTier(level);
  const gem   = el('div', `msg-level-gem ${tier.cls}`);
  gem.textContent = level;
  gem.title = `Level ${level}`;

  if (tier.bg) {
    gem.style.background   = tier.bg;
    gem.style.backgroundSize = tier.bgSize || 'auto';
  }

  return gem;
}
