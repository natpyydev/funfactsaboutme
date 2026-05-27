/**
 * modules/titles.js
 *
 * Builds the title chip element for a prestige message bubble.
 * Reads equippedTitle from profileCache (kept fresh by cosmetics-phase2-patch.js).
 * Returns null when no title is equipped or title def not found.
 */

'use strict';

import { el } from '../core/utils.js';

/**
 * @param {string|null} equippedTitleId   — from getEquippedTitle(uid)
 * @param {number}      level             — used for "Legend" label at lv 99
 * @returns {HTMLElement|null}
 */
export function buildTitles(equippedTitleId, level) {
  const wrap = el('div', 'msg-prestige-titles');

  // Level legend label (always shown at max level regardless of title)
  if (level >= 99) {
    const legendChip = el('span', 'prestige-legend-label');
    legendChip.textContent = '🌟 Legend';
    wrap.appendChild(legendChip);
  }

  // Equipped cosmetic title
  if (equippedTitleId && level < 99) {
    const titleDef = _findTitle(equippedTitleId);
    if (titleDef) {
      const meta = _rarityMeta(titleDef.rarity);
      const chip = el('span', 'prestige-title-chip');
      chip.dataset.titleId  = equippedTitleId;
      chip.dataset.rarity   = titleDef.rarity || 'common';
      chip.textContent      = titleDef.label;
      chip.style.color      = meta.color;
      chip.style.textShadow = `0 0 8px ${meta.glow}`;
      wrap.appendChild(chip);
    }
  }

  return wrap.children.length ? wrap : null;
}

/* ── Internal helpers ──────────────────────────────────────── */

function _findTitle(id) {
  // Primary: cosmetics-system registry (always up-to-date)
  const registry = window._natCosmetics?.TITLE_REGISTRY;
  if (registry) return registry.find(t => t.id === id) || null;
  return null;
}

function _rarityMeta(rarity) {
  const meta = window._natCosmetics?.RARITY_META;
  if (meta?.[rarity]) return meta[rarity];
  // Fallback palette so the module works even if RARITY_META isn't loaded
  const fallback = {
    developer: { color: '#bf6fff', glow: 'rgba(160,80,255,0.55)'  },
    legendary:  { color: '#ffb800', glow: 'rgba(255,184,0,0.50)'  },
    mythic:     { color: '#ff4cbc', glow: 'rgba(255,76,188,0.45)' },
    epic:       { color: '#a78bfa', glow: 'rgba(167,139,250,0.45)' },
    sacred:     { color: '#fde68a', glow: 'rgba(253,230,138,0.40)' },
    rare:       { color: '#60a5fa', glow: 'rgba(96,165,250,0.40)'  },
    uncommon:   { color: '#4ade80', glow: 'rgba(74,222,128,0.35)' },
    common:     { color: '#94a3b8', glow: 'rgba(148,163,184,0.25)' },
    cursed:     { color: '#f87171', glow: 'rgba(248,113,113,0.45)' },
  };
  return fallback[rarity] || fallback.common;
}
