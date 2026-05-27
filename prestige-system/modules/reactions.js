/**
 * modules/reactions.js
 *
 * Moves the existing reaction buttons row (.msg-react-row / .msg-actions)
 * into the prestige layout. Uses move-not-clone so all click handlers
 * (toggleMsgReaction etc.) continue to work without re-attachment.
 */

'use strict';

import { el, qs } from '../core/utils.js';

const REACT_SELECTORS = [
  '.msg-react-row',
  '.msg-reactions',
  '.msg-react-btns',
];

/**
 * @param {Element} bubble — original message bubble
 * @returns {HTMLElement|null}
 */
export function buildReactions(bubble) {
  for (const sel of REACT_SELECTORS) {
    const found = qs(bubble, sel);
    if (found) {
      found.classList.add('msg-prestige-reactions');
      return found; // moved, not cloned
    }
  }

  // If no dedicated row, collect individual react buttons
  const btns = bubble.querySelectorAll('.msg-react-btn');
  if (!btns.length) return null;

  const row = el('div', 'msg-prestige-reactions');
  btns.forEach(btn => row.appendChild(btn)); // move
  return row;
}
