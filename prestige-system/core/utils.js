/**
 * core/utils.js
 *
 * Shared constants, DOM helpers, and profile data accessors.
 * No rendering logic lives here — only pure utilities that any
 * module can import without creating circular dependencies.
 */

'use strict';

/* ============================================================
   CONSTANTS
   ============================================================ */

export const PRESTIGE_SELECTOR  = '.message-bubble.prestige-user';
export const PRESTIGE_LOADED_ATTR = 'data-prestige-loaded';
export const MESSAGES_LIST_ID   = 'messagesList';

/** Level thresholds → CSS tier class + gradient */
export const LEVEL_TIERS = [
  { min: 99, cls: 'tier-mythic',  bg: 'linear-gradient(135deg,#ffcc00,#ff5e00,#ffcc00)', bgSize: '200% 200%' },
  { min: 80, cls: 'tier-cosmic',  bg: 'linear-gradient(135deg,#00c6ff,#0072ff)' },
  { min: 60, cls: 'tier-plasma',  bg: 'linear-gradient(135deg,#ff00cc,#7b00ff)' },
  { min: 40, cls: 'tier-gold',    bg: 'linear-gradient(135deg,#ffcc00,#ff9900)' },
  { min: 20, cls: 'tier-silver',  bg: 'linear-gradient(135deg,#8e9eab,#eef2f3)' },
  { min:  0, cls: 'tier-bronze',  bg: 'linear-gradient(135deg,#8b5a2b,#cd7f32)' },
];

/* ============================================================
   DOM CREATION HELPERS
   ============================================================ */

/**
 * Create an element with a class and optional inline style string.
 * Prefer this over innerHTML to avoid XSS and parser overhead.
 *
 * @param {string} tag
 * @param {string} className
 * @param {string} [cssText]
 * @returns {HTMLElement}
 */
export function el(tag, className, cssText) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (cssText)   node.style.cssText = cssText;
  return node;
}

/**
 * Append multiple children to a parent in one call.
 * Skips null/undefined silently so callers don't need guards.
 *
 * @param {HTMLElement} parent
 * @param {...(HTMLElement|null|undefined)} children
 */
export function appendAll(parent, ...children) {
  children.forEach(child => {
    if (child != null) parent.appendChild(child);
  });
}

/**
 * Safe querySelector — returns null instead of throwing
 * if the selector is invalid (guards against broken DOM states).
 *
 * @param {Element} root
 * @param {string} sel
 * @returns {Element|null}
 */
export function qs(root, sel) {
  try { return root.querySelector(sel); }
  catch { return null; }
}

/**
 * Extract the plain text username from a .msg-sender element
 * without touching any child elements (crowns, badges, etc.).
 * Returns only the direct text-node content.
 *
 * This exists because .msg-sender has global CSS rules applying
 * text-overflow:ellipsis with !important. We never clone the
 * element itself — we extract the string and build fresh DOM.
 *
 * @param {Element|null} senderSpan
 * @returns {string}
 */
export function extractUsername(senderSpan) {
  if (!senderSpan) return 'anonymous friend';

  let raw = '';
  senderSpan.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      raw += node.textContent;
    }
  });

  const trimmed = raw.trim();
  return trimmed || senderSpan.textContent.trim() || 'anonymous friend';
}

/* ============================================================
   PROFILE DATA ACCESSORS
   All reads from window globals go through here so modules
   never access window directly — easier to mock in tests,
   easier to swap data sources later.
   ============================================================ */

/**
 * @param {string} uid
 * @returns {object} profile object or {}
 */
export function getProfile(uid) {
  return (uid && window.profileCache?.[uid]) || {};
}

/**
 * @param {string} uid
 * @returns {number} level (0 if unknown)
 */
export function getLevel(uid) {
  return getProfile(uid).level || 0;
}

/**
 * @param {string} uid
 * @returns {string|null}
 */
export function getEquippedTitle(uid) {
  return getProfile(uid).equippedTitle || null;
}

/**
 * @param {string} uid
 * @returns {string|null} frameId or null
 */
export function getFrameId(uid) {
  const cache = window._natFrames?.cache || {};
  return cache[uid] || null;
}

/**
 * @param {string} frameId
 * @returns {object|null} frame definition
 */
export function getFrameDef(frameId) {
  return (frameId && window._natFrames?.registry?.[frameId]) || null;
}

/**
 * @param {string} uid
 * @returns {boolean}
 */
export function isVIP(uid) {
  return !!(window.isVIP && window.isVIP(uid));
}

/**
 * @param {string} uid
 * @returns {boolean}
 */
export function isAdmin(uid) {
  return !!(
    window._natFirebase?.isAdmin?.(uid) ||
    uid === window._natFirebase?.ADMIN_UID
  );
}

/**
 * @param {string} uid
 * @returns {boolean}
 */
export function isMythicFrame(uid) {
  const frameId = getFrameId(uid);
  const def = getFrameDef(frameId);
  return def?.tier === 'mythic';
}

/* ============================================================
   LEVEL TIER LOOKUP
   ============================================================ */

/**
 * Return the tier descriptor for a given level.
 * @param {number} level
 * @returns {{ cls: string, bg: string, bgSize?: string }}
 */
export function getTier(level) {
  return LEVEL_TIERS.find(t => level >= t.min) || LEVEL_TIERS.at(-1);
}

/* ============================================================
   LOGGING
   Centralised so it can be silenced in production with one flag.
   ============================================================ */

const DEBUG = window._prestigeDebug === true;

export function log(...args)  { if (DEBUG) console.log('[prestige]',  ...args); }
export function warn(...args) { console.warn('[prestige]', ...args); }
export function err(...args)  { console.error('[prestige]', ...args); }
