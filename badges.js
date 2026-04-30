// ============================================================
// BADGE SYSTEM
// Each category shows HIGHEST TIER ONLY
// Top tier of every category has a unique animation
// ============================================================

// "group" field = category key, used to deduplicate (keep highest earned per group)
export const BADGES = {

  emoji_streaks: {
    '😍': [
      { id:'simp1', group:'simp', need:1, label:'Baby Simp',          desc:'React 😍 on 1 photo',      icon:'🌸', anim:'' },
      { id:'simp2', group:'simp', need:2, label:'Certified Simp',     desc:'React 😍 on 2 photos',     icon:'💗', anim:'' },
      { id:'simp3', group:'simp', need:3, label:'Simp Lord',          desc:'React 😍 on 3 photos',     icon:'💘', anim:'' },
      { id:'simp4', group:'simp', need:4, label:'Simp King/Queen',    desc:'React 😍 on 4 photos',     icon:'👑', anim:'' },
      { id:'simp5', group:'simp', need:5, label:'Simp Deity',         desc:'React 😍 on 5 photos',     icon:'🌟', anim:'' },
      { id:'simp6', group:'simp', need:6, label:'✨ ULTIMATE SIMP ✨', desc:'React 😍 on ALL 6 photos', icon:'💖', anim:'badge-heartbeat' },
    ],
    '😭': [
      { id:'cry1', group:'cry', need:1, label:'First Tear',           desc:'React 😭 on 1 photo',      icon:'💧', anim:'' },
      { id:'cry2', group:'cry', need:2, label:'Crybaby',              desc:'React 😭 on 2 photos',     icon:'😢', anim:'' },
      { id:'cry3', group:'cry', need:3, label:'Waterfall Mode',       desc:'React 😭 on 3 photos',     icon:'🌊', anim:'' },
      { id:'cry4', group:'cry', need:4, label:'Ocean Eyes',           desc:'React 😭 on 4 photos',     icon:'🌧️',anim:'' },
      { id:'cry5', group:'cry', need:5, label:'Tsunami Alert',        desc:'React 😭 on 5 photos',     icon:'⛈️',anim:'' },
      { id:'cry6', group:'cry', need:6, label:'🌊 ULTIMATE CRIER 🌊', desc:'React 😭 on ALL 6 photos', icon:'🌊', anim:'badge-wave' },
    ],
    '💅': [
      { id:'slay1', group:'slay', need:1, label:'Slay Starter',      desc:'React 💅 on 1 photo',      icon:'✨', anim:'' },
      { id:'slay2', group:'slay', need:2, label:'Slay Mode On',      desc:'React 💅 on 2 photos',     icon:'💅', anim:'' },
      { id:'slay3', group:'slay', need:3, label:'Slay Professional', desc:'React 💅 on 3 photos',     icon:'👸', anim:'' },
      { id:'slay4', group:'slay', need:4, label:'Slay Icon',         desc:'React 💅 on 4 photos',     icon:'🎀', anim:'' },
      { id:'slay5', group:'slay', need:5, label:'Slay Legend',       desc:'React 💅 on 5 photos',     icon:'🏆', anim:'' },
      { id:'slay6', group:'slay', need:6, label:'💅 ULTIMATE SLAYER 💅',desc:'React 💅 on ALL 6 photos',icon:'💅',anim:'badge-glitter' },
    ],
    '🥺': [
      { id:'soft1', group:'soft', need:1, label:'Soft Starter',      desc:'React 🥺 on 1 photo',      icon:'🌷', anim:'' },
      { id:'soft2', group:'soft', need:2, label:'Softie',            desc:'React 🥺 on 2 photos',     icon:'🐣', anim:'' },
      { id:'soft3', group:'soft', need:3, label:'Cotton Candy Soul', desc:'React 🥺 on 3 photos',     icon:'🍬', anim:'' },
      { id:'soft4', group:'soft', need:4, label:'Marshmallow Heart', desc:'React 🥺 on 4 photos',     icon:'☁️', anim:'' },
      { id:'soft5', group:'soft', need:5, label:'Wholesomeness Inc.',desc:'React 🥺 on 5 photos',     icon:'🌈', anim:'' },
      { id:'soft6', group:'soft', need:6, label:'🌈 ULTIMATE SOFTIE 🌈',desc:'React 🥺 on ALL 6 photos',icon:'🌸',anim:'badge-rainbow-spin' },
    ],
    '😆': [
      { id:'bash1', group:'bash', need:1, label:'Basic Basher',      desc:'React 😆 on 1 photo',      icon:'😏', anim:'' },
      { id:'bash2', group:'bash', need:2, label:'Basher',            desc:'React 😆 on 2 photos',     icon:'😆', anim:'' },
      { id:'bash3', group:'bash', need:3, label:'Roast Rookie',      desc:'React 😆 on 3 photos',     icon:'🔥', anim:'' },
      { id:'bash4', group:'bash', need:4, label:'Certified Roaster', desc:'React 😆 on 4 photos',     icon:'🌶️',anim:'' },
      { id:'bash5', group:'bash', need:5, label:'Great Basher',      desc:'React 😆 on 5 photos',     icon:'💀', anim:'' },
      { id:'bash6', group:'bash', need:6, label:'💀 ULTIMATE BASHER 💀',desc:'React 😆 on ALL 6 photos',icon:'💀',anim:'badge-inferno' },
    ],
  },

  allrounder: [
    { id:'ar1',  group:'ar', need:1,  label:'First React',          desc:'React on your first photo',          icon:'🎯', anim:'' },
    { id:'ar2',  group:'ar', need:2,  label:'Double Dipper',        desc:'React on 2 different photos',        icon:'🎲', anim:'' },
    { id:'ar3',  group:'ar', need:3,  label:'Triple Threat',        desc:'React on 3 different photos',        icon:'🔱', anim:'' },
    { id:'ar4',  group:'ar', need:4,  label:'Almost There',         desc:'React on 4 different photos',        icon:'⚡', anim:'' },
    { id:'ar5',  group:'ar', need:5,  label:'Almost a Stan',        desc:'React on 5 different photos',        icon:'🌠', anim:'' },
    { id:'ar6',  group:'ar', need:6,  label:'Full Album React',     desc:'React on all 6 photos',              icon:'📸', anim:'' },
    { id:'ar30', group:'ar', need:30, label:'🌟 ULTIMATE ALL-ROUNDER 🌟',desc:'Max react everything (30 total)',icon:'🌟',anim:'badge-starburst' },
  ],

  total_reacts: [
    { id:'tot1',  group:'tot', need:1,  label:'Lurker No More',     desc:'Send your first reaction',           icon:'👀', anim:'' },
    { id:'tot3',  group:'tot', need:3,  label:'Getting Warmed Up',  desc:'Send 3 reactions total',             icon:'🌡️',anim:'' },
    { id:'tot5',  group:'tot', need:5,  label:'Engaged',            desc:'Send 5 reactions total',             icon:'✅', anim:'' },
    { id:'tot10', group:'tot', need:10, label:'React Addict',       desc:'Send 10 reactions total',            icon:'💉', anim:'' },
    { id:'tot15', group:'tot', need:15, label:'Parasocial Arc',     desc:'Send 15 reactions total',            icon:'🫀', anim:'' },
    { id:'tot20', group:'tot', need:20, label:'No Life',            desc:'Send 20 reactions total',            icon:'🪦', anim:'' },
    { id:'tot25', group:'tot', need:25, label:'Clinically Obsessed',desc:'Send 25 reactions total',            icon:'🏥', anim:'' },
    { id:'tot30', group:'tot', need:30, label:'💫 MAXIMUM REACT 💫', desc:'Reacted to literally everything',   icon:'💫', anim:'badge-orbit' },
  ],

  combos: [
    { id:'mix2', group:'mix', need:2, label:'Emotionally Confused', desc:'Use 2 different emoji types',        icon:'🤔', anim:'' },
    { id:'mix3', group:'mix', need:3, label:'Mood Swinger',         desc:'Use 3 different emoji types',        icon:'🎭', anim:'' },
    { id:'mix4', group:'mix', need:4, label:'Multi-Dimensional',    desc:'Use 4 different emoji types',        icon:'🌀', anim:'' },
    { id:'mix5', group:'mix', need:5, label:'🌈 Indecisive Legend 🌈',desc:'Used ALL 5 emoji types',           icon:'🌈', anim:'badge-prism' },
  ],

  messages: [
    { id:'msg1',  group:'msg', need:1,  label:'Brave Soul',         desc:'Send your first message',            icon:'📨', anim:'' },
    { id:'msg3',  group:'msg', need:3,  label:'Chatterbox',         desc:'Send 3 messages',                    icon:'💬', anim:'' },
    { id:'msg5',  group:'msg', need:5,  label:"Can't Shut Up",      desc:'Send 5 messages',                    icon:'🗣️',anim:'' },
    { id:'msg10', group:'msg', need:10, label:'📢 LOUD AND PROUD 📢',desc:'Send 10 messages',                  icon:'📢', anim:'badge-megaphone' },
  ],

  artist: [
    { id:'art1',   group:'art1',   emoji:'🤩', label:'Amazed Fan',    desc:'React 🤩 on the special pic',        icon:'🤩', anim:'' },
    { id:'art2',   group:'art2',   emoji:'👑', label:'Royal Taste',   desc:'React 👑 on the special pic',        icon:'👑', anim:'' },
    { id:'art3',   group:'art3',   emoji:'💀', label:'Deceased Fan',  desc:'React 💀 on the special pic',        icon:'💀', anim:'' },
  { 
  id: 'art4', 
  group: 'art4', 
  emoji: '\u{1F928}', 
  label: 'Bright??', 
  desc: 'React \u{1F928} on the special pic', 
  icon: '\u{1F928}', 
  anim: '' 
},

    { id:'art5',   group:'art5',   emoji:'😤', label:'Petty Hater',   desc:'React 😤 on the special pic',        icon:'😤', anim:'' },
    { id:'art_all',group:'art_all',need:5,     label:'🎤 ULTIMATE STAN 🎤',desc:'React with ALL emojis on special pic',icon:'🎤',anim:'badge-concert' },
  ],

  secret: [
    { id:'secret1', group:'secret1', label:'Early Adopter',          desc:'One of the first to visit!',                      icon:'🥇', anim:'' },
    { id:'secret2', group:'secret2', label:'Night Owl',              desc:'Visited between midnight and 4 AM',               icon:'🌙', anim:'badge-moonrise' },
    { id:'secret3', group:'secret3', label:'Overachiever',           desc:'Earned 10 or more badges in one visit',           icon:'🎖️',anim:'badge-starburst' },
    { id:'secret4', group:'secret4', label:'Betrayer',               desc:'Reacted 😤 AND 😍 on the same photo',            icon:'🐍', anim:'badge-wave' },
    { id:'secret5', group:'secret5', label:'Main Character',         desc:'React on every photo AND send a message',         icon:'🎬', anim:'badge-glitter' },
  ],

  // ── CHAMPION badges (auto-awarded by leaderboard activity) ──
  champion: [
    { id:'ch_daily',  group:'ch_daily',  label:'👑 Daily Champion',
      desc:'Top of the leaderboard for a day', icon:'👑', anim:'badge-glitter' },
    { id:'ch_weekly', group:'ch_weekly', label:'🏆 Weekly Champion',
      desc:'Top of the leaderboard for a week', icon:'🏆', anim:'badge-starburst' },
    { id:'ch_yearly', group:'ch_yearly', label:'🌌 Yearly Champion',
      desc:'Top of the leaderboard for a YEAR', icon:'🌌', anim:'badge-rainbow-spin' },
    { id:'ch_combo',  group:'ch_combo',  label:'🔥 Daily Highest Combo',
      desc:'Hit the highest combo of the day', icon:'🔥', anim:'badge-inferno' },
  ],

  // ── POST-ETERNAL legend badges ──
  ascended: [
    { id:'asc_trans',     group:'asc_trans',     label:'🪐 Transcendent',
      desc:'Reach 50,000 lifetime combos',  icon:'🪐', anim:'badge-orbit' },
    { id:'asc_mythic',    group:'asc_mythic',    label:'🐉 Mythic',
      desc:'Reach 100,000 lifetime combos', icon:'🐉', anim:'badge-inferno' },
    { id:'asc_celestial', group:'asc_celestial', label:'🌠 Celestial',
      desc:'Reach 250,000 lifetime combos', icon:'🌠', anim:'badge-starburst' },
    { id:'asc_divine',    group:'asc_divine',    label:'⚜️ Divine',
      desc:'Reach 500,000 lifetime combos', icon:'⚜️', anim:'badge-glitter' },
    { id:'asc_godly',     group:'asc_godly',     label:'👁️ Godly',
      desc:'Reach 1,000,000 lifetime combos', icon:'👁️', anim:'badge-rainbow-spin' },
    { id:'asc_omega',     group:'asc_omega',     label:'🅾️ OMEGA',
      desc:'Reach 5,000,000 lifetime combos', icon:'🅾️', anim:'badge-prism' },
  ],

  vip: [
    { id:'vip_member', group:'vip_member', label:'💎 VIP Member',
      desc:'Granted VIP by the dev — exclusive perks site-wide', icon:'💎', anim:'badge-glitter' },
  ],

  // ── SPECIAL ROLE BADGES (assigned manually in Firebase or hardcoded) ──
  roles: [
    {
      id:'role_mod', group:'role_mod',
      label:'Moderator',
      desc:'Keeps this place in check 🔨',
      icon:'🛡️',
      anim:'badge-mod',
    },
    {
      id:'role_dev', group:'role_dev',
      label:'Developer',
      desc:'Built this whole thing 💻',
      icon:'⚙️',
      anim:'badge-dev',
    },
    {
      id:'role_bug', group:'role_bug',
      label:'Bugger',
      desc:'Found and reported bugs 🐛',
      icon:'🐛',
      anim:'badge-bug',
    },
    {
      id:'role_badgemaker', group:'role_badgemaker',
      label:'Badge Maker',
      desc:'Designed the badge system 🏅',
      icon:'🏅',
      anim:'badge-badgemaker',
    },
  ],
};

// ── COMPUTE: returns only the HIGHEST earned badge per group ──
export function computeBadges(userGifReactions, userArtistReacts, msgCount = 0, roleIds = []) {
  const allEarned = new Set();

  const emojiCount    = {};
  const photosReacted = new Set();
  let   totalNormalReacts = 0;
  const emojiTypesUsed    = new Set();

  for (let i = 0; i < 5; i++) {
    const picReacts = userGifReactions[i] || {};
    let reactedThisPic = false;
    NORMAL_REACTIONS_LIST.forEach(emoji => {
      if (picReacts[emoji]) {
        emojiCount[emoji] = (emojiCount[emoji] || 0) + 1;
        totalNormalReacts++;
        reactedThisPic = true;
        emojiTypesUsed.add(emoji);
      }
    });
    if (reactedThisPic) photosReacted.add(i);
  }

  // Per-emoji streaks — add ALL earned, dedup later
  Object.entries(BADGES.emoji_streaks).forEach(([emoji, tiers]) => {
    const count = emojiCount[emoji] || 0;
    tiers.forEach(tier => { if (count >= tier.need) allEarned.add(tier.id); });
  });

  // All-rounder
  BADGES.allrounder.forEach(b => {
    if (b.id === 'ar30' && totalNormalReacts >= 30) allEarned.add(b.id);
    else if (b.id !== 'ar30' && photosReacted.size >= b.need) allEarned.add(b.id);
  });

  // Total reacts
  BADGES.total_reacts.forEach(b => { if (totalNormalReacts >= b.need) allEarned.add(b.id); });

  // Combos
  BADGES.combos.forEach(b => { if (emojiTypesUsed.size >= b.need) allEarned.add(b.id); });

  // Messages
  BADGES.messages.forEach(b => { if (msgCount >= b.need) allEarned.add(b.id); });

  // Artist
  const artistReactCount = Object.values(userArtistReacts).filter(Boolean).length;
  BADGES.artist.forEach(b => {
    if (b.emoji && userArtistReacts[b.emoji]) allEarned.add(b.id);
    if (b.need && artistReactCount >= b.need) allEarned.add(b.id);
  });

  // Secrets
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 4) allEarned.add('secret2');
  for (let i = 0; i < 5; i++) {
    const p = userGifReactions[i] || {};
    if (p['😤'] && p['😍']) { allEarned.add('secret4'); break; }
  }
  if (photosReacted.size >= 6 && msgCount >= 1) allEarned.add('secret5');
  if (allEarned.size >= 10) allEarned.add('secret3');

  // Role badges
  roleIds.forEach(id => allEarned.add(id));

  // ── DEDUPLICATE: keep only highest tier per group ──
  return deduplicateByGroup(allEarned);
}

function deduplicateByGroup(earnedIds) {
  const all      = getAllBadgesFlat();
  const bestPerGroup = {}; // group -> badge (last/highest wins since arrays are ordered low→high)

  all.forEach(b => {
    if (!earnedIds.has(b.id)) return;
    // Later in array = higher tier, so just overwrite
    bestPerGroup[b.group] = b.id;
  });

  return new Set(Object.values(bestPerGroup));
}

export const NORMAL_REACTIONS_LIST = ['😍', '😭', '💅', '🥺', '😆'];

function getAllBadgesFlat() {
  const all = [];
  Object.values(BADGES.emoji_streaks).forEach(tiers => all.push(...tiers));
  all.push(...BADGES.allrounder);
  all.push(...BADGES.total_reacts);
  all.push(...BADGES.combos);
  all.push(...BADGES.messages);
  all.push(...BADGES.artist);
  all.push(...BADGES.secret);
  all.push(...(BADGES.champion || []));
  all.push(...(BADGES.ascended || []));
  all.push(...(BADGES.vip || []));
  all.push(...BADGES.roles);
  return all;
}

export function getAllBadges() { return getAllBadgesFlat(); }

export function getBadgeById(id) {
  return getAllBadgesFlat().find(b => b.id === id);
}

// ============================================================
// BADGE_ORDER — impossible to easy (for display sorting)
// Role badges first (rarest), then secrets, then earned badges
// ============================================================
export const BADGE_ORDER = [
  // Role badges (given by admin — rarest)
  'role_badgemaker','role_dev','role_mod','role_bug',
  // VIP
  'vip_member',
  // Champions (rare timed achievements)
  'ch_yearly','ch_weekly','ch_daily','ch_combo',
  // Ascended combo legends
  'asc_omega','asc_godly','asc_divine','asc_celestial','asc_mythic','asc_trans',
  // Secret / hidden
  'secret5','secret3','secret2','secret4','secret1',
  // Ultimate (hardest earned)
  'ar30','tot30','simp6','cry6','slay6','soft6','bash6','mix5',
  // Artist ultimate
  'art_all',
  // High tiers
  'simp5','cry5','slay5','soft5','bash5','tot25',
  'ar6','tot20','mix4',
  // Mid tiers
  'simp4','cry4','slay4','soft4','bash4','tot15','ar5','mix3',
  // Low-mid
  'simp3','cry3','slay3','soft3','bash3','tot10','ar4','msg10','mix2',
  // Artist individual
  'art1','art2','art3','art4','art5',
  // Low tiers
  'simp2','cry2','slay2','soft2','bash2','tot5','ar3','msg5',
  // Easiest
  'simp1','cry1','slay1','soft1','bash1','tot3','ar2','msg3','tot1','ar1','msg1',
];