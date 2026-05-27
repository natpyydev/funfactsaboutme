/**
 * core/layout.js
 *
 * Layout constants that both JS modules and CSS (via CSS custom
 * properties) agree on. If you change a dimension here, only
 * this file needs updating.
 *
 * How to use in CSS:
 *   Import prestige-layout.css which reads from these via
 *   CSS custom properties set on :root by injectLayoutTokens().
 *
 * How to use in JS:
 *   import { LAYOUT } from './layout.js';
 *   el.style.width = LAYOUT.AVATAR_SIZE_PX + 'px';
 */

'use strict';

export const LAYOUT = {
  // Left column
  LEFT_COL_WIDTH_PX:   52,
  LEFT_COL_WIDTH_MOBILE_PX: 60,

  // Avatar
  AVATAR_SIZE_PX:      48,
  AVATAR_SIZE_MOBILE_PX: 54,

  // Gem
  GEM_SIZE_PX:         28,
  GEM_SIZE_MOBILE_PX:  32,
  GEM_FONT_SIZE_PX:    11,
  GEM_FONT_SIZE_MOBILE_PX: 13,

  // Username row
  USERNAME_FONT_SIZE_PX: 18,
  USERNAME_FONT_SIZE_MOBILE_PX: 16,

  // Particle count — reduce for low-power mode
  PARTICLE_COUNT: 6,
  PARTICLE_COUNT_LOW_POWER: 0,

  // Gap between columns
  WRAP_GAP_PX: 8,
  WRAP_GAP_MOBILE_PX: 10,

  // Mobile breakpoint
  MOBILE_BREAKPOINT_PX: 700,
};

/**
 * Inject layout values as CSS custom properties on :root.
 * Call once during init so CSS can reference --prestige-* vars
 * without duplicating pixel values.
 */
export function injectLayoutTokens() {
  const L = LAYOUT;
  const root = document.documentElement;

  const tokens = {
    '--prestige-left-col-width':       L.LEFT_COL_WIDTH_PX + 'px',
    '--prestige-avatar-size':          L.AVATAR_SIZE_PX + 'px',
    '--prestige-gem-size':             L.GEM_SIZE_PX + 'px',
    '--prestige-gem-font':             L.GEM_FONT_SIZE_PX + 'px',
    '--prestige-username-font':        L.USERNAME_FONT_SIZE_PX + 'px',
    '--prestige-wrap-gap':             L.WRAP_GAP_PX + 'px',
  };

  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));
}

/**
 * Returns true if the device is likely low-power or prefers
 * reduced motion — used by particles.js to skip animation.
 *
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
