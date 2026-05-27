/**
 * modules/usernameRow.js
 *
 * Builds the username + timestamp row for a prestige bubble.
 * Extracts the plain-text username from .msg-sender, rebuilds
 * a clean element (avoids inheriting broken overflow CSS),
 * and places the timestamp on the right.
 */

'use strict';

import { el, extractUsername } from '../core/utils.js';

/**
 * @param {Element|null} senderSpan  — original .msg-sender
 * @param {Element|null} timeSpan    — original .msg-time
 * @returns {HTMLElement}
 */
export function buildUsernameRow(senderSpan, timeSpan) {
  const row = el('div', 'msg-prestige-username-row');

  // Username
  const nameEl = el('span', 'msg-prestige-username');
  nameEl.textContent = extractUsername(senderSpan);

  // Inline badges from original sender (crowns, role badges)
  if (senderSpan) {
    senderSpan.querySelectorAll('.admin-crown, .user-badges-inline, .badge-more-indicator')
      .forEach(child => {
        // Clone so original DOM isn't broken (badges may have listeners)
        nameEl.appendChild(child.cloneNode(true));
      });
  }

  row.appendChild(nameEl);

  // Timestamp
  if (timeSpan) {
    const ts = el('span', 'msg-prestige-time');
    ts.textContent = timeSpan.textContent || '';
    row.appendChild(ts);
  }

  return row;
}
