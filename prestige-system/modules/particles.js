/**
 * modules/particles.js
 *
 * Optionally adds a lightweight ambient particle layer to
 * prestige bubbles. Only rendered for mythic/legendary tiers
 * and skipped entirely on potato/performance graphics mode.
 *
 * Returns null when particles should be skipped.
 */

'use strict';

import { el } from '../core/utils.js';

const PARTICLE_COUNT = 4;

/**
 * @returns {HTMLElement|null}
 */
export function buildParticles() {
  // Respect graphics quality setting
  const gfx = localStorage.getItem('natnat-graphics');
  if (gfx === 'potato' || gfx === 'performance' || gfx === 'superformance') {
    return null;
  }
  // Skip on mobile to preserve 60fps scroll
  if (window.innerWidth <= 600) return null;

  const layer = el('div', 'msg-prestige-particles');

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = el('div', 'prestige-particle');
    p.style.cssText = [
      `--p-x: ${10 + Math.random() * 80}%`,
      `--p-delay: ${(Math.random() * 3).toFixed(2)}s`,
      `--p-dur: ${(2 + Math.random() * 3).toFixed(2)}s`,
      `--p-size: ${4 + Math.random() * 6}px`,
    ].join(';');
    layer.appendChild(p);
  }

  return layer;
}
