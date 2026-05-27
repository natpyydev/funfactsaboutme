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
      { id:'simp6', group:'simp', need:6, label:'✨ ULTIMATE SIMP ✨', desc:'React 😍 on ALL 6 photos', icon:'💖', anim:'badge-heartbeat', howTo:'React with 😍 on every single photo in the gallery.' },
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
    { id:'ar30', group:'ar', need:30, label:'🌟 ULTIMATE ALL-ROUNDER 🌟',desc:'Max react everything (30 total)',icon:'🌟',anim:'badge-starburst', howTo:'Send the maximum 30 total reactions across all photos and emoji types.' },
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
    { id:'secret1', group:'secret1', label:'Early Adopter',          desc:'One of the first to visit!',                      icon:'🥇', anim:'',               howTo:'Visit the site very early — this badge is no longer obtainable.' },
    { id:'secret2', group:'secret2', label:'Night Owl',              desc:'Visited between midnight and 4 AM',               icon:'🌙', anim:'badge-moonrise',  howTo:'Open the site between 12:00 AM and 4:00 AM local time.' },
    { id:'secret3', group:'secret3', label:'Overachiever',           desc:'Earned 10 or more badges in one visit',           icon:'🎖️',anim:'badge-starburst', howTo:'Earn 10+ different badges in a single visit.' },
    { id:'secret4', group:'secret4', label:'Betrayer',               desc:'Reacted 😤 AND 😍 on the same photo',            icon:'🐍', anim:'badge-wave',      howTo:'React with both 😤 and 😍 on the same photo. Chaotic energy required.' },
    { id:'secret5', group:'secret5', label:'Main Character',         desc:'React on every photo AND send a message',         icon:'🎬', anim:'badge-glitter',   howTo:'React on every single photo AND leave a message.' },
  ],

  // ── CHAMPION badges (auto-awarded by leaderboard activity) ──
  champion: [
    { id:'ch_daily',  group:'ch_daily',  label:'👑 Daily Champion',
      desc:'Top of the leaderboard for a day',  icon:'👑', anim:'badge-glitter',      howTo:'Reach #1 on the leaderboard for a full day.' },
    { id:'ch_weekly', group:'ch_weekly', label:'🏆 Weekly Champion',
      desc:'Top of the leaderboard for a week', icon:'🏆', anim:'badge-starburst',    howTo:'Stay at #1 on the leaderboard for a full week.' },
    { id:'ch_yearly', group:'ch_yearly', label:'🌌 Yearly Champion',
      desc:'Top of the leaderboard for a YEAR', icon:'🌌', anim:'badge-rainbow-spin', howTo:'Dominate the leaderboard for an entire year. Legendary grind.' },
    { id:'ch_combo',  group:'ch_combo',  label:'🔥 Daily Highest Combo',
      desc:'Hit the highest combo of the day',  icon:'🔥', anim:'badge-inferno',      howTo:'Get the single highest combo score in one day.' },
  ],

  // ── POST-ETERNAL legend badges ──
  ascended: [
    { id:'asc_trans',     group:'asc_trans',     label:'🪐 Transcendent',
      desc:'Reach 50,000 lifetime combos',         icon:'🪐',  anim:'badge-orbit' },
    { id:'asc_mythic',    group:'asc_mythic',    label:'🐉 Mythic',
      desc:'Reach 100,000 lifetime combos',        icon:'🐉',  anim:'badge-inferno' },
    { id:'asc_celestial', group:'asc_celestial', label:'🌠 Celestial',
      desc:'Reach 250,000 lifetime combos',        icon:'🌠',  anim:'badge-celestial' },
    { id:'asc_divine',    group:'asc_divine',    label:'⚜️ Divine',
      desc:'Reach 500,000 lifetime combos',        icon:'⚜️', anim:'badge-divine' },
    { id:'asc_godly',     group:'asc_godly',     label:'👁️ Godly',
      desc:'Reach 1,000,000 lifetime combos',      icon:'👁️', anim:'badge-godly' },
    { id:'asc_omega',     group:'asc_omega',     label:'🅾️ OMEGA',
      desc:'Reach 5,000,000 lifetime combos',      icon:'🅾️', anim:'badge-omega' },
    { id:'asc_void',      group:'asc_void',      label:'🌑 The Void',
      desc:'Reach 10,000,000 lifetime combos',     icon:'🌑',  anim:'badge-void',      plate:'plate-void' },
    { id:'asc_fallen',    group:'asc_fallen',    label:'🔱 The Fallen',
      desc:'Reach 25,000,000 lifetime combos',     icon:'🔱',  anim:'badge-fallen',    plate:'plate-fallen' },
    { id:'asc_abyss',     group:'asc_abyss',     label:'🌌 The Abyss',
      desc:'Reach 50,000,000 lifetime combos',     icon:'🌌',  anim:'badge-abyss',     plate:'plate-abyss' },
    { id:'asc_risen',     group:'asc_risen',     label:'🕊️ The Risen',
      desc:'Reach 100,000,000 lifetime combos',    icon:'🕊️', anim:'badge-risen',     plate:'plate-risen' },
    { id:'asc_beginning', group:'asc_beginning', label:'🌅 The Beginning',
      desc:'Reach 250,000,000 lifetime combos',    icon:'🌅',  anim:'badge-beginning', plate:'plate-beginning' },
    { id:'asc_end',       group:'asc_end',       label:'🏁 The End',
      desc:'Reach 500,000,000 lifetime combos',    icon:'🏁',  anim:'badge-end',       plate:'plate-end' },
    { id:'asc_bigbang',   group:'asc_bigbang',   label:'💥 The Big Bang',
      desc:'Reach 1,000,000,000 lifetime combos',  icon:'💥',  anim:'badge-bigbang',   plate:'plate-bigbang' },
  ],

  vip: [
    { id:'vip_member', group:'vip_member', label:'💎 VIP Member',
      desc:'Granted VIP by the dev — exclusive perks site-wide', icon:'💎', anim:'badge-glitter',
      howTo:'Granted by the dev manually. Keep being awesome 💎' },
  ],

  // ── SPECIAL ROLE BADGES (assigned manually in Firebase or hardcoded) ──
  roles: [
    {
      id:'role_mod', group:'role_mod',
      label:'Moderator',
      desc:'Keeps this place in check 🔨',
      icon:'🛡️',
      anim:'badge-mod',
      howTo:'Assigned by the dev to trusted members who help moderate the site.',
    },
    {
      id:'role_dev', group:'role_dev',
      label:'Developer',
      desc:'Built this whole thing 💻',
      icon:'⚙️',
      anim:'badge-dev',
      howTo:'Awarded to the site creator. Not obtainable by regular visitors.',
    },
    {
      id:'dev_legend', group:'dev_legend',
      label:'Dev Legend',
      desc:'Awarded to the site creator 👑',
      icon:'👑',
      anim:'badge-dev',
      howTo:'Awarded to site creator. You cannot obtain this.',
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

  // ── HOBBY BADGES (awarded when you interact with each hobby) ──
  hobbies: [
    { id:'hobby_photo',    group:'hobby_photo',    label:'📷 Shutterbug',       desc:'Clicked the Photography hobby',       icon:'📷', anim:'' },
    { id:'hobby_coding',   group:'hobby_coding',   label:'💻 Code Enjoyer',     desc:'Clicked the Coding hobby',            icon:'💻', anim:'' },
    { id:'hobby_watch',    group:'hobby_watch',    label:'📺 Binge Watcher',    desc:'Clicked the Watch History hobby',     icon:'📺', anim:'' },
    { id:'hobby_sports',   group:'hobby_sports',   label:'🏸 Sports Buddy',     desc:'Wants to play with Nat',              icon:'🏸', anim:'' },
    { id:'hobby_digiart',  group:'hobby_digiart',  label:'🎨 Art Appreciator',  desc:'Clicked the Digital Arts hobby',      icon:'🎨', anim:'' },
    { id:'hobby_cinema',   group:'hobby_cinema',   label:'🎬 Film Fan',         desc:'Clicked the Cinematographer hobby',   icon:'🎬', anim:'' },
    { id:'hobby_video',    group:'hobby_video',    label:'📹 Vlog Viewer',      desc:'Clicked the Videographer hobby',      icon:'📹', anim:'' },
    { id:'hobby_editor',   group:'hobby_editor',   label:'✂️ Editor Gang',      desc:'Clicked the Editor hobby',            icon:'✂️', anim:'' },
    { id:'hobby_music',    group:'hobby_music',    label:'🎸 Music Lover',      desc:'Clicked the Music hobby',             icon:'🎸', anim:'' },
    { id:'hobby_games',    group:'hobby_games',    label:'🎮 Player 2',         desc:'Wants to play games with Nat',        icon:'🎮', anim:'' },
    { id:'hobby_disciple', group:'hobby_disciple', label:'🌟 Disciple Badge',   desc:'Explored every single hobby!',        icon:'🌟', anim:'badge-starburst' },
  ],

  // ── SERVICE BADGES (awarded when you click service buttons) ──
  services: [
    { id:'svc_book_bike',    group:'svc_book_bike',    label:'🚲 Cyclist',          desc:'Booked a bike lesson',               icon:'🚲', anim:'' },
    { id:'svc_book_ebike',   group:'svc_book_ebike',   label:'🛵 E-Rider',          desc:'Booked an e-bike lesson',            icon:'🛵', anim:'' },
    { id:'svc_teach_motor',  group:'svc_teach_motor',  label:'🏍 Motorista',        desc:'Asked to learn motor riding',        icon:'🏍', anim:'' },
    { id:'svc_teach_car',    group:'svc_teach_car',    label:'🚗 Driver',           desc:'Asked to learn car driving',         icon:'🚗', anim:'' },
    { id:'svc_friend_plate', group:'svc_friend_plate', label:'🤝 Friend Plate',     desc:'Applied to be Nat\'s friend',        icon:'🤝', anim:'' },
    { id:'svc_bff_plate',    group:'svc_bff_plate',    label:'💗 BFF Plate',        desc:'Applied to be Nat\'s BFF',           icon:'💗', anim:'badge-heartbeat' },
    { id:'svc_gf_plate',     group:'svc_gf_plate',     label:'💘 GF Plate',         desc:'Applied to be Nat\'s GF/BF',         icon:'💘', anim:'badge-heartbeat' },
    { id:'svc_kamote_rider', group:'svc_kamote_rider', label:'🛵 Kamote Rider',     desc:'Booked all riding lessons!',         icon:'🛵', anim:'badge-glitter' },
    { id:'svc_boss',         group:'svc_boss',         label:'👔 Boss Badge',        desc:'Asked for all teaching services!',   icon:'👔', anim:'badge-starburst' },
  ],

// ── SPECIAL / UNLOCKABLE BADGES ──
  special: [
    { id:'badge_disgusting',    group:'badge_disgusting',    label:'🤮 Disgusting',              desc:'Tried to unlock premium photos',                     icon:'🤮', anim:'' },
    { id:'badge_superformance', group:'badge_superformance', label:'🚄 Superformance',           desc:'Unlocked the secret Superformance mode',             icon:'🚄', anim:'badge-glitter' },
    { id:'badge_christmas',     group:'badge_christmas',     label:'🎅 Christmas Special',       desc:'Enabled the Christmas theme',                        icon:'🎅', anim:'badge-rainbow-spin' },
    { id:'badge_potato',        group:'badge_potato',        label:'🥔 Potato PC User',          desc:'Enabled Potato PC mode',                             icon:'🥔', anim:'' },
    { id:'badge_performance',   group:'badge_performance',   label:'⚡ Performance Mode',        desc:'Enabled Performance mode',                           icon:'⚡', anim:'' },
    { id:'badge_deep_abyss',    group:'badge_deep_abyss',    label:'🌊 Deep Sea Abyss Explorer', desc:'Dared to enter the Sunken Archive underwater theme', icon:'🌊', anim:'badge-wave' },
    // ── THEME BADGES — awarded on first theme activation ──
    { id:'badge_cyber_agent',   group:'badge_cyber_agent',   label:'💻 Cyber Agent',             desc:'Entered the Cyber surveillance grid',                icon:'💻', anim:'badge-glitch' },
    { id:'badge_hellfire',      group:'badge_hellfire',      label:'🔥 Hellfire',                desc:'Survived the descent into Hell',                     icon:'🔥', anim:'badge-inferno' },
    { id:'badge_angel',         group:'badge_angel',         label:'✨ Angel',                   desc:'Ascended into the Heaven realm',                     icon:'✨', anim:'badge-holy' },
    { id:'badge_forest_spirit', group:'badge_forest_spirit', label:'🌿 Forest Spirit',           desc:'Heard the whisper of the old forest',                icon:'🌿', anim:'badge-nature' },
    { id:'badge_astronaut',     group:'badge_astronaut',     label:'🚀 Astronaut',               desc:'Drifted past the event horizon',                     icon:'🚀', anim:'badge-space' },
    { id:'badge_y2k',           group:'badge_y2k',           label:'💾 Y2K',                    desc:'Recovered from the corrupted archive',               icon:'💾', anim:'badge-y2k' },
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
  all.push(...(BADGES.hobbies || []));
  all.push(...(BADGES.services || []));
  all.push(...(BADGES.special || []));
  return all;
}

export function getAllBadges() { return getAllBadgesFlat(); }

// ── O(1) badge lookup map — built once at module load ──
// getAllBadgesFlat() is called exactly once here, not once per render.
const _badgeMap = new Map(getAllBadgesFlat().map(b => [b.id, b]));

export function getBadgeById(id) {
  return _badgeMap.get(id);
}

// ── Pre-computed sort-index map so BADGE_ORDER.indexOf() isn't called
//    once per badge per message during rendering ──
// Populated after BADGE_ORDER is declared (see bottom of file).
export const BADGE_ORDER_MAP = new Map(); // id -> rank index (filled below)

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
  // Ascended combo legends (Beyond Omega — rarest first)
  'asc_bigbang','asc_end','asc_beginning','asc_risen','asc_abyss','asc_fallen','asc_void',
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
// Special unlockable — theme badges (rarer than performance/potato, less rare than deep_abyss)
  'badge_deep_abyss','badge_superformance','badge_christmas',
  // Theme exploration badges (ordered: most atmospheric → most casual)
  'badge_hellfire','badge_angel','badge_astronaut','badge_cyber_agent','badge_forest_spirit','badge_y2k',
  // Hobby disciple (hardest hobby badge)
  'hobby_disciple',
  // Service prestige
  'svc_boss','svc_kamote_rider',
  // Hobby individual
  'hobby_photo','hobby_coding','hobby_watch','hobby_sports','hobby_digiart',
  'hobby_cinema','hobby_video','hobby_editor','hobby_music','hobby_games',
  // Service individual
  'svc_friend_plate','svc_bff_plate','svc_gf_plate',
  'svc_book_bike','svc_book_ebike','svc_teach_motor','svc_teach_car',
  // Novelty
  'badge_disgusting','badge_performance','badge_potato',
];

// Ascended badge thresholds (for combo-based awarding in app.js)
export const ASCENDED_THRESHOLDS = [
  { id:'asc_trans',     min: 50_000 },
  { id:'asc_mythic',    min: 100_000 },
  { id:'asc_celestial', min: 250_000 },
  { id:'asc_divine',    min: 500_000 },
  { id:'asc_godly',     min: 1_000_000 },
  { id:'asc_omega',     min: 5_000_000 },
  { id:'asc_void',      min: 10_000_000 },
  { id:'asc_fallen',    min: 25_000_000 },
  { id:'asc_abyss',     min: 50_000_000 },
  { id:'asc_risen',     min: 100_000_000 },
  { id:'asc_beginning', min: 250_000_000 },
  { id:'asc_end',       min: 500_000_000 },
  { id:'asc_bigbang',   min: 1_000_000_000 },
];

// All hobby badge ids (for checking disciple completion)
export const ALL_HOBBY_BADGE_IDS = [
  'hobby_photo','hobby_coding','hobby_watch','hobby_sports','hobby_digiart',
  'hobby_cinema','hobby_video','hobby_editor','hobby_music','hobby_games',
];

// All "Book" service badge ids
export const ALL_BOOK_BADGE_IDS = ['svc_book_bike','svc_book_ebike'];

// All "Teach" service badge ids
export const ALL_TEACH_BADGE_IDS = ['svc_teach_motor','svc_teach_car'];

// Populate the O(1) sort-index map now that BADGE_ORDER is defined.
// Any id NOT in BADGE_ORDER gets index 999 (renders last).
BADGE_ORDER.forEach((id, i) => BADGE_ORDER_MAP.set(id, i));

// ============================================================
// EXTRA HELPERS / AUTO AWARD SYSTEM
// ============================================================

// Get highest badge from a specific category
export function getHighestBadgeFromGroup(badgeIds, groupName) {
  const earned = [...badgeIds];
  const badges = earned
    .map(id => getBadgeById(id))
    .filter(Boolean)
    .filter(b => b.group === groupName);

  if (!badges.length) return null;

  badges.sort((a, b) => {
    const ai = BADGE_ORDER_MAP.get(a.id) ?? 999;
    const bi = BADGE_ORDER_MAP.get(b.id) ?? 999;
    return ai - bi;
  });

  return badges[0];
}

// Sort badges by rarity/order
export function sortBadges(ids) {
  return [...ids].sort((a, b) => {
    const ai = BADGE_ORDER_MAP.get(a) ?? 999;
    const bi = BADGE_ORDER_MAP.get(b) ?? 999;
    return ai - bi;
  });
}

// ============================================================
// AUTO SERVICE BADGES
// ============================================================

export function checkServiceBadges(currentBadges) {
  const earned = new Set(currentBadges);

  // Kamote Rider
  const hasAllBook = ALL_BOOK_BADGE_IDS.every(id => earned.has(id));
  if (hasAllBook) earned.add('svc_kamote_rider');

  // Boss Badge
  const hasAllTeach = ALL_TEACH_BADGE_IDS.every(id => earned.has(id));
  if (hasAllTeach) earned.add('svc_boss');

  return earned;
}

// ============================================================
// AUTO HOBBY BADGES
// ============================================================

export function checkHobbyBadges(currentBadges) {
  const earned = new Set(currentBadges);

  const completedAll = ALL_HOBBY_BADGE_IDS.every(id => earned.has(id));

  if (completedAll) {
    earned.add('hobby_disciple');
  }

  return earned;
}

// ============================================================
// AUTO ASCENDED BADGES
// ============================================================

export function getAscendedBadges(comboCount) {
  const earned = [];

  ASCENDED_THRESHOLDS.forEach(tier => {
    if (comboCount >= tier.min) {
      earned.push(tier.id);
    }
  });

  return earned;
}

// ============================================================
// GET BADGE CSS CLASS
// ============================================================

export function getBadgeClass(badgeId) {
  const badge = getBadgeById(badgeId);

  if (!badge) return '';

  return badge.anim || '';
}

// ============================================================
// GET BADGE PLATE
// ============================================================

export function getBadgePlate(badgeId) {
  const badge = getBadgeById(badgeId);

  if (!badge) return '';

  return badge.plate || '';
}

// ============================================================
// FILTER ONLY DISPLAYABLE BADGES
// ============================================================

export function getDisplayBadges(badgeSet) {
  return sortBadges([...badgeSet]).map(id => getBadgeById(id)).filter(Boolean);
}

// ============================================================
// CHECK IF USER HAS BADGE
// ============================================================

export function hasBadge(badgeSet, badgeId) {
  return badgeSet.has(badgeId);
}