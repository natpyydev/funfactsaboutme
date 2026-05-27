// =========================================================
// 🎖 COMBO BADGES — leaderboard-only badge system
// Awarded for LIFETIME total combos earned across services.
// Lower tiers = simple. Higher tiers = absolutely unhinged ✨
// =========================================================

export const COMBO_TIERS = [
  { min: 0,      id: 'none',         icon: '',    name: '',              className: '' },
  { min: 10,     id: 'sprout',       icon: '🌱',  name: 'Sprout',        className: 'cb-sprout' },
  { min: 50,     id: 'spark',        icon: '✨',  name: 'Spark',         className: 'cb-spark' },
  { min: 100,    id: 'bolt',         icon: '⚡',  name: 'Bolt',          className: 'cb-bolt' },
  { min: 250,    id: 'blaze',        icon: '🔥',  name: 'Blaze',         className: 'cb-blaze' },
  { min: 500,    id: 'inferno',      icon: '🌋',  name: 'Inferno',       className: 'cb-inferno' },
  { min: 1000,   id: 'diamond',      icon: '💎',  name: 'Diamond',       className: 'cb-diamond' },
  { min: 2500,   id: 'royal',        icon: '👑',  name: 'Royal',         className: 'cb-royal' },
  { min: 5000,   id: 'cosmic',       icon: '🌌',  name: 'Cosmic',        className: 'cb-cosmic' },
  { min: 10000,  id: 'legendary',    icon: '🚀',  name: 'Legendary',     className: 'cb-legendary' },
  { min: 25000,  id: 'eternal',      icon: '♾️',  name: 'ETERNAL',       className: 'cb-eternal' },
  // ─── post-eternal ascension tiers ───
  { min: 50000,  id: 'transcendent', icon: '🪐',  name: 'TRANSCENDENT',  className: 'cb-transcendent' },
  { min: 100000, id: 'mythic',       icon: '🐉',  name: 'MYTHIC',        className: 'cb-mythic' },
  { min: 250000, id: 'celestial',    icon: '🌠',  name: 'CELESTIAL',     className: 'cb-celestial' },
  { min: 500000, id: 'divine',       icon: '⚜️',  name: 'DIVINE',        className: 'cb-divine' },
  { min: 1000000,id: 'godly',        icon: '👁️',  name: 'GODLY',         className: 'cb-godly' },
  { min: 5000000,   id: 'omega',     icon: '🅾️',  name: 'OMEGA',         className: 'cb-omega' },
  // ─── beyond Omega — legendary ascension tiers ───
  { min: 10000000,  id: 'void',       icon: '🌑',  name: 'THE VOID',      className: 'cb-void' },
  { min: 25000000,  id: 'fallen',     icon: '🔱',  name: 'THE FALLEN',    className: 'cb-fallen' },
  { min: 50000000,  id: 'abyss',      icon: '🌌',  name: 'THE ABYSS',     className: 'cb-abyss' },
  { min: 100000000, id: 'risen',      icon: '🕊️',  name: 'THE RISEN',     className: 'cb-risen' },
  { min: 250000000, id: 'beginning',  icon: '🌅',  name: 'THE BEGINNING', className: 'cb-beginning' },
  { min: 500000000, id: 'end',        icon: '🏁',  name: 'THE END',       className: 'cb-end' },
  { min: 1000000000,id: 'bigbang',    icon: '💥',  name: 'THE BIG BANG',  className: 'cb-bigbang' },
];

// Returns the highest tier the user qualifies for (or null if below the first)
export function getComboBadge(count) {
  let badge = null;
  for (const tier of COMBO_TIERS) {
    if (count >= tier.min && tier.id !== 'none') badge = tier;
  }
  return badge;
}

// Returns the next tier the user is working toward (for progress bars)
export function getNextComboTier(count) {
  for (const tier of COMBO_TIERS) {
    if (count < tier.min && tier.id !== 'none') return tier;
  }
  return null; // already at max
}

// Renders the badge HTML chip for the leaderboard
export function renderComboBadgeHTML(count) {
  const b = getComboBadge(count);
  if (!b) return '';
  return `<span class="combo-badge ${b.className}" title="${b.name} — ${count.toLocaleString()} combos">${b.icon} ${b.name}</span>`;
}
