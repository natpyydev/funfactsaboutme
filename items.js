/* 🎒 ITEMS — Inventory system (separate from badges)
   Items are rare collectibles earned through special events.
   Stored in localStorage under 'nat-items' */
(() => {
  const STORE_KEY = 'nat-items';

  const ITEM_DEFS = {
    'item_santa_hat': {
      id:   'item_santa_hat',
      name: '🎅 Santa Hat',
      desc: 'a fuzzy red hat left behind by Santa himself. wear it wisely.',
      icon: '🎅',
      rarity: 'rare',
    },
    'item_santa_letter': {
      id:   'item_santa_letter',
      name: '📜 Letter for Santa',
      desc: 'a magical letter addressed to the North Pole. what did you wish for?',
      icon: '📜',
      rarity: 'rare',
    },
    'item_deep_archive': {
      id:   'item_deep_archive',
      name: 'T̴̗͊h̸̼͝ë̵̢́ ̷͍̾Ȧ̸͖r̶̤̀ĉ̷͜h̶͎͝ḯ̵͜v̷̨͒ë̶̤',
      desc: 'found in the deep abyss ..... ?',
      icon: '📼',
      rarity: 'cursed',
    },

    // ── THEME CUTSCENE COMPLETION ITEMS ──
    // Awarded ONLY on full cutscene watch — never on skip, never on theme activation.
    // These are evidence, not rewards.

    'item_encrypted_usb': {
      id:     'item_encrypted_usb',
      name:   '💻 Encrypted USB',
      desc:   'recovered after the experiment logs were wiped. contains fragmented permissions and surveillance data from a session that was never supposed to exist. the filename is your uid.',
      icon:   '💻',
      rarity: 'classified',
    },
    'item_sinners_tag': {
      id:     'item_sinners_tag',
      name:   '🔥 Sinner\'s Tag',
      desc:   'burned identification tag from someone who entered before you. almost unreadable from heat damage. the name on it is not yours — but the access level is.',
      icon:   '🔥',
      rarity: 'cursed',
    },
    'item_golden_halo': {
      id:     'item_golden_halo',
      name:   '✨ Cracked Halo',
      desc:   'the light inside it flickers but never goes out. symbolizes a perfection that was never real. it feels warm in a way that makes you uncomfortable.',
      icon:   '✨',
      rarity: 'sacred',
    },
    'item_whispering_seed': {
      id:     'item_whispering_seed',
      name:   '🌿 Whispering Seed',
      desc:   'it makes no sound you can hear directly. but at night, in silence, you are certain it is remembering voices. do not plant it.',
      icon:   '🌿',
      rarity: 'organic',
    },
    'item_event_horizon_shard': {
      id:     'item_event_horizon_shard',
      name:   '🚀 Event Horizon Shard',
      desc:   'fragment recovered near a black hole anomaly. distorts nearby light. the timestamp on the recovery log is 14 seconds before you arrived.',
      icon:   '🚀',
      rarity: 'anomaly',
    },
    'item_corrupted_avatar': {
      id:     'item_corrupted_avatar',
      name:   '💾 Corrupted Avatar',
      desc:   'glitched digital profile recovered from an abandoned social platform. the face changes every time you open it. you have seen your own face in it twice.',
      icon:   '💾',
      rarity: 'corrupted',
    },
    'item_sunken_memory': {
      id:     'item_sunken_memory',
      name:   '🌊 Sunken Memory',
      desc:   'a water-damaged photograph from the archive. nobody in the image has a face anymore. the location in the background looks familiar.',
      icon:   '🌊',
      rarity: 'cursed',
    },
    'item_silent_bell': {
      id:     'item_silent_bell',
      name:   '🎄 Silent Bell',
      desc:   'rings without producing sound. something about it feels deeply nostalgic. something about it feels deeply wrong. both at the same time.',
      icon:   '🎄',
      rarity: 'rare',
    },
  };

  function loadItems() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
  }
  function saveItems(arr) { localStorage.setItem(STORE_KEY, JSON.stringify(arr)); }

  window.getInventory = function() { return loadItems(); };

  window.hasItem = function(id) { return loadItems().includes(id); };

  window.awardItem = function(id) {
    if (!ITEM_DEFS[id]) return;
    const items = loadItems();
    if (items.includes(id)) return;
    items.push(id);
    saveItems(items);
    _showItemToast(ITEM_DEFS[id]);
    window.dispatchEvent(new CustomEvent('nat-item-awarded', { detail: { id } }));
  };

  function _showItemToast(def) {
    const el = document.createElement('div');
    el.className = 'item-toast';
    el.innerHTML = `
      <div class="item-toast-icon">${def.icon}</div>
      <div class="item-toast-body">
        <div class="item-toast-label">🎒 item obtained</div>
        <div class="item-toast-name">${def.name}</div>
        <div class="item-toast-desc">${def.desc}</div>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.classList.add('show'); });
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 600);
    }, 4200);
  }

  window.openInventory = function() {
    const items  = loadItems();
    const defs   = items.map(id => ITEM_DEFS[id]).filter(Boolean);
    const overlay = document.createElement('div');
    overlay.className = 'inv-overlay';
    overlay.innerHTML = `
      <div class="inv-modal" onclick="event.stopPropagation()">
        <div class="inv-title">🎒 inventory</div>
        <p class="inv-sub">rare items found on your journey</p>
        ${defs.length === 0
          ? '<div class="inv-empty">nothing here yet… explore more 🌊</div>'
          : `<div class="inv-grid">${defs.map(d => `
            <div class="inv-item rarity-${d.rarity}">
              <div class="inv-item-icon">${d.icon}</div>
              <div class="inv-item-name">${d.name}</div>
              <div class="inv-item-desc">${d.desc}</div>
            </div>`).join('')}</div>`
        }
        <button class="inv-close-btn" onclick="this.closest('.inv-overlay').remove()">close</button>
      </div>`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
  };

  window.ITEM_DEFS = ITEM_DEFS;
})();
