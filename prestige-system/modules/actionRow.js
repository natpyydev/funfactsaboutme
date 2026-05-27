/**
 * modules/actionRow.js
 *
 * Collects action buttons from the bubble and moves them into a
 * single .msg-action-row container.
 *
 * MOVE not clone — preserves existing click handlers.
 *
 * Button order is defined by ACTION_SELECTORS. Add or remove
 * selectors here to change which buttons appear and in what order.
 */

'use strict';

import { el, qs } from '../core/utils.js';

const ACTION_SELECTORS = [
  '.reply-toggle-btn',
  '.upvote-btn',
  '.delete-btn',
  '.pin-btn',
];

/**
 * @param {Element} bubble
 * @returns {HTMLDivElement}  always returns a div (may be empty)
 */
export function buildActionRow(bubble) {
  const row = el('div', 'msg-action-row');

  ACTION_SELECTORS.forEach(sel => {
    const btn = qs(bubble, sel);
    if (btn) row.appendChild(btn);
  });

  return row;
}
