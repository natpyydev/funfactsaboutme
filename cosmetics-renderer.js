// cosmetics-renderer.js
// Shared chip builders used by messages, leaderboard, and profile cards.
// Import from badges.js (root) and cosmetics-system for rarity meta.

export function renderBadgeChip(badgeId) {
  const { getBadgeById, getBadgeClass } = window._natBadges; // see Step 2
  const badge = getBadgeById(badgeId);
  if (!badge) return null;
  
  const chip = document.createElement('span');
  chip.className = `badge-chip ${getBadgeClass(badgeId)}`;
  chip.dataset.badgeId = badgeId;
  chip.title = `${badge.label}: ${badge.desc}`;
  chip.textContent = badge.icon;
  return chip;
}

export function renderTitleChip(titleId) {
  const registry = window._natCosmetics?.TITLE_REGISTRY;
  const meta = window._natCosmetics?.RARITY_META;
  if (!registry || !titleId) return null;
  
  const def = registry.find(t => t.id === titleId);
  if (!def) return null;
  
  const rarityMeta = meta?.[def.rarity] || { color: '#94a3b8', glow: 'rgba(148,163,184,.25)' };
  
  const chip = document.createElement('span');
  chip.className = 'prestige-title-chip';
  chip.dataset.titleId = titleId;
  chip.dataset.rarity = def.rarity || 'common';
  chip.textContent = def.label;
  chip.style.color = rarityMeta.color;
  chip.style.textShadow = `0 0 8px ${rarityMeta.glow}`;
  return chip;
}

export function renderEliteBadges(uid) {
  // Reads from cosmetics-system instead of ELITE_BADGE_DEFS in prestige/modules/badges.js
  const cs = window._natCosmetics;
  if (!cs || !uid) return null;
  
  const state = cs.getState();
  const chips = [];
  
  if (window.isAdmin?.(uid)) chips.push(_eliteChip('DEV', 'elite-badge--dev'));
  if (window.isVIP?.(uid)) chips.push(_eliteChip('VIP', 'elite-badge--vip'));
  if (window.isMythicFrame?.(uid)) chips.push(_eliteChip('MYTHIC', 'elite-badge--mythic'));
  if (window.profileCache?.[uid]?.og) chips.push(_eliteChip('OG', 'elite-badge--og'));
  if (window.profileCache?.[uid]?.beta) chips.push(_eliteChip('BETA', 'elite-badge--beta'));
  
  if (!chips.length) return null;
  
  const wrap = document.createElement('div');
  wrap.className = 'msg-elite-badges';
  chips.forEach(c => wrap.appendChild(c));
  return wrap;
}

function _eliteChip(label, cls) {
  const s = document.createElement('span');
  s.className = `elite-badge ${cls}`;
  s.textContent = label;
  return s;
}