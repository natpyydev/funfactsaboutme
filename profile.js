/* 👤 PROFILE — PFP, name, username, displayed badges, plate, hide-level toggle.
   Stored at userProfiles/$uid in Firebase.
   Username uniqueness enforced via usernames/{usernameLC} = uid.
*/
(() => {
  // ── bad-word filter ──────────────────────────────────────────────────────
  const BAD_WORDS = [
    'fuck','shit','bitch','ass','asshole','bastard','cunt','dick','pussy',
    'faggot','nigger','nigga','whore','slut','retard','piss','damn','cock',
    'boob','tits','porn','sex','rape','kill','die','hate','idiot','moron',
    'stupid','loser','trash','garbage','putangina','gago','tangina','ulol',
    'bobo','tarantado','leche','puta','kupal','tite','butas','kantot',
  ];
  function hasBadWord(str) {
    const lower = str.toLowerCase().replace(/[^a-z0-9]/g,'');
    return BAD_WORDS.some(w => lower.includes(w));
  }
  function cleanUsername(raw) {
    return raw.trim().toLowerCase().replace(/[^a-z0-9_.\-]/g, '').slice(0, 24);
  }

  function build() {
    if (document.getElementById('profileSection')) return;
    const sec = document.createElement('section');
    sec.id = 'profileSection';
    sec.className = 'profile-section';
    sec.innerHTML = `
      <h2 class="section-title">👤 my profile</h2>
      <p class="section-sub">customise your card · seen on messages, leaderboard & guestbook 💗</p>

      <div class="prof-card" id="profCard">
        <div class="prof-pfp-wrap">
          <div class="prof-pfp" id="profPfp">🙂</div>
          <button class="prof-pfp-edit" id="profPfpEdit" title="change pfp">✏️</button>
          <input type="file" id="profPfpFile" accept="image/*" hidden>
        </div>
        <div class="prof-info">
          <input id="profNameInput" class="prof-name-input" maxlength="30" placeholder="your display name…">
          <div class="prof-username-row">
            <span class="prof-username-label" id="profUsernameLabel">@—</span>
            <button class="prof-username-btn" id="profUsernameEditBtn">✏️ change username</button>
          </div>
          <div class="prof-level-line" id="profLevelLine">LVL — · 0 EXP</div>
          <div class="prof-badges-row" id="profBadgesRow"><span class="prof-empty">no badges equipped</span></div>
        </div>
      </div>

      <!-- Username change modal -->
      <div id="profUsernameModal" class="prof-modal hidden">
        <div class="prof-modal-inner">
          <h4>✏️ Change Username</h4>
          <p style="opacity:.65;font-size:12px;margin:0 0 10px">
            lowercase · letters, numbers, _ and . only · max 24 chars
          </p>
          <input id="profUsernameInput" class="prof-name-input" maxlength="24"
                 placeholder="new_username…" autocomplete="off" spellcheck="false">
          <div id="profUsernameStatus" style="font-size:12px;min-height:16px;margin:6px 0 10px;color:#ff7eb6"></div>
          <div style="display:flex;gap:8px">
            <button class="prof-save-btn" id="profUsernameSaveBtn" style="flex:1">save ✅</button>
            <button class="prof-save-btn" id="profUsernameCloseBtn"
                    style="flex:0 0 auto;background:#eee;color:#555">cancel</button>
          </div>
        </div>
      </div>

      <div class="prof-grid">
        <div class="prof-block">
          <div class="prof-block-title">🎨 message plate (unlocked via level-up)</div>
          <div class="plate-grid" id="plateGrid"></div>
        </div>
        <div class="prof-block">
          <div class="prof-block-title">⚙️ options</div>
          <label class="prof-toggle">
            <input type="checkbox" id="profHideLevel">
            <span>Hide my level on messages</span>
          </label>
          <label class="prof-toggle">
            <input type="checkbox" id="profUsePfpInGame">
            <span>Use my PFP as my game character sticker</span>
          </label>
          <label class="prof-toggle">
            <input type="checkbox" id="profShowPfp">
            <span>Show my PFP publicly on messages, leaderboard &amp; map pins 🌍</span>
          </label>
          <button class="prof-save-btn" id="profSaveBtn">save profile 💾</button>
        </div>
        <div class="prof-block">
          <div class="prof-block-title">🏅 equip badges (unlimited)</div>
          <div id="badgePickerGrid" class="badge-picker-grid"></div>
        </div>
      </div>
    `;
    document.querySelector('main').appendChild(sec);
    wire();
    listen();
  }

  let local = {
    name: '', pfp: '', plate: 'paper', equippedBadges: [],
    hideLevel: false, usePfpInGame: false, showPfp: false,
    username: '',
  };

  // ── wire ────────────────────────────────────────────────────────────────
  function wire() {
    document.getElementById('profPfpEdit').onclick = () => document.getElementById('profPfpFile').click();
    document.getElementById('profPfpFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { local.pfp = await resize(f, 200); paintPfp(); }
      catch { alert('couldn\'t read that image 😭'); }
    });
    document.getElementById('profSaveBtn').onclick = saveProfile;
    document.getElementById('profNameInput').addEventListener('input', e => {
      local.name = e.target.value.slice(0, 30);
    });
    document.getElementById('profHideLevel').addEventListener('change', e => {
      local.hideLevel = e.target.checked; saveProfile();
    });
    document.getElementById('profUsePfpInGame').addEventListener('change', e => {
      local.usePfpInGame = e.target.checked; saveProfile();
    });
    document.getElementById('profShowPfp').addEventListener('change', e => {
      local.showPfp = e.target.checked; saveProfile();
    });
    window.addEventListener('plate-changed', e => { local.plate = e.detail.plate; paintPlate(); });

    // Username modal
    document.getElementById('profUsernameEditBtn').onclick = openUsernameModal;
    document.getElementById('profUsernameCloseBtn').onclick = closeUsernameModal;
    document.getElementById('profUsernameSaveBtn').onclick = saveUsername;
    document.getElementById('profUsernameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') saveUsername();
      if (e.key === 'Escape') closeUsernameModal();
    });

    paintAll();
  }

  function openUsernameModal() {
    const modal = document.getElementById('profUsernameModal');
    const input = document.getElementById('profUsernameInput');
    const status = document.getElementById('profUsernameStatus');
    if (!modal || !input) return;
    input.value = local.username || '';
    if (status) status.textContent = '';
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 80);
  }
  function closeUsernameModal() {
    document.getElementById('profUsernameModal')?.classList.add('hidden');
  }

  async function saveUsername() {
    const input  = document.getElementById('profUsernameInput');
    const status = document.getElementById('profUsernameStatus');
    const raw    = input?.value || '';
    const uname  = cleanUsername(raw);

    const setStatus = (msg, color) => { if (status) { status.textContent = msg; status.style.color = color || '#ff7eb6'; } };

    if (!uname) return setStatus('username can\'t be empty 😤');
    if (uname.length < 2) return setStatus('at least 2 characters please');
    if (hasBadWord(uname)) return setStatus('🚫 that username is not allowed');
    if (uname === (local.username || '').toLowerCase()) {
      return setStatus('that\'s already your username 👀', '#888');
    }

    const db  = window._natDB;
    const uid = db?.getUID();
    if (!db || !uid) return setStatus('still loading… try again');

    setStatus('checking availability…', '#888');

    // Check if username is taken
    const snap = await db.get(db.ref(db.db, 'usernames/' + uname)).catch(() => null);
    if (snap && snap.exists() && snap.val() !== uid) {
      // Admin can override / reclaim any username
      const isAdminUser = db.isAdmin ? db.isAdmin(uid) : false;
      if (!isAdminUser) return setStatus('❌ @' + uname + ' is already taken — try another');
      // Admin: forcibly reclaim — proceed without returning
    }

    setStatus('saving…', '#888');

    // Release old username claim (if any)
    if (local.username) {
      const oldLC = local.username.toLowerCase();
      if (oldLC !== uname) {
        await db.remove(db.ref(db.db, 'usernames/' + oldLC)).catch(() => {});
      }
    }

    // Claim new username
    await db.set(db.ref(db.db, 'usernames/' + uname), uid).catch(e => {
      setStatus('error: ' + e.message, '#e74c3c'); throw e;
    });

    // Save to profile
    local.username = uname;
    await db.set(db.ref(db.db, 'userProfiles/' + uid + '/username'), uname).catch(() => {});

    setStatus('✅ @' + uname + ' is yours!', '#27ae60');
    paintUsernameLabel();
    setTimeout(closeUsernameModal, 1200);
  }

  // ── resize ──────────────────────────────────────────────────────────────
  function resize(file, maxDim) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = rej;
      const r = new FileReader();
      r.onload = e => img.src = e.target.result;
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // ── paint helpers ────────────────────────────────────────────────────────
  function paintAll() { paintPfp(); paintLevel(); paintPlates(); paintBadges(); paintBadgePicker(); paintPlate(); paintUsernameLabel(); }

  function paintUsernameLabel() {
    const el = document.getElementById('profUsernameLabel');
    if (el) el.textContent = local.username ? '@' + local.username : '@—';
  }

  function paintPfp() {
    const el = document.getElementById('profPfp'); if (!el) return;
    if (local.pfp) el.innerHTML = `<img src="${local.pfp}" alt="pfp">`;
    else el.innerHTML = '🙂';
    document.getElementById('profNameInput').value = local.name || '';
    document.getElementById('profHideLevel').checked = !!local.hideLevel;
    document.getElementById('profUsePfpInGame').checked = !!local.usePfpInGame;
    const showPfpEl = document.getElementById('profShowPfp');
    if (showPfpEl) showPfpEl.checked = !!local.showPfp;
  }

  function paintLevel() {
    const el = document.getElementById('profLevelLine'); if (!el) return;
    if (typeof window.getLevelInfo !== 'function') { el.textContent = 'LVL — · 0 EXP'; return; }
    const i = window.getLevelInfo();
    el.textContent = `LVL ${i.level} · ${i.exp.toLocaleString()} / ${i.need === Infinity ? '∞' : i.need.toLocaleString()} EXP`;
    el.classList.toggle('hidden-stat', !!local.hideLevel);
  }

  function paintPlate() {
    const card = document.getElementById('profCard'); if (!card) return;
    const cur = window.getPlateInfo ? window.getPlateInfo(local.plate) : null;
    card.className = 'prof-card ' + (cur?.class || 'plate-paper');
  }

  function paintPlates() {
    const grid = document.getElementById('plateGrid'); if (!grid) return;
    if (!window.getAllPlates) { grid.innerHTML = '<i style="opacity:.6">loading…</i>'; return; }
    const all = window.getAllPlates();
    const unlocked = window.getUnlockedPlates ? window.getUnlockedPlates() : ['paper'];
    grid.innerHTML = all.map(p => {
      const isUnlocked = unlocked.includes(p.id);
      const isActive = p.id === local.plate;
      return `
        <button class="plate-tile ${p.class} ${isUnlocked ? '' : 'locked'} ${isActive ? 'active' : ''}" data-plate="${p.id}">
          <span class="plate-name">${p.name}</span>
          <span class="plate-meta">${isUnlocked ? (isActive ? 'EQUIPPED ✓' : 'tap to equip') : 'unlock @ LVL ' + p.unlock}</span>
        </button>
      `;
    }).join('');
    grid.querySelectorAll('.plate-tile').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.plate;
        if (b.classList.contains('locked')) {
          showToast('locked! reach LVL ' + window.getPlateInfo(id).unlock + ' to unlock 🔒');
          return;
        }
        if (window.equipPlate(id)) {
          local.plate = id;
          paintPlates();
          paintPlate();
          showToast('plate equipped 🎨');
        }
      };
    });
  }

  // ── BADGE PERFORMANCE: cache + lazy load ──────────────────────────────────
  const _badgeRenderCache = new Map(); // id → button outerHTML (equipped=false state)
  const BADGE_PAGE_SIZE   = 20;
  let   _badgePageCount   = 1;         // how many pages currently rendered
  let   _lastEarnedSnapshot = null;    // reference equality check

  /** Build a single badge button HTML string (no glow anim in picker for perf). */
  function _buildBpTile(id, equipped) {
    const b = window.__badgesAPI.getBadgeById(id);
    if (!b) return '';
    // Strip animated glow in picker; only CSS transform allowed
    const safeDesc = (b.howTo || b.desc || '').replace(/"/g, '&quot;');
    return `<button class="bp-tile${equipped ? ' equipped' : ''}" data-id="${id}" title="${safeDesc}">${b.icon} <span class="bp-lab">${b.label}</span></button>`;
  }

  /** Open badge info modal when a tile is clicked. */
  function _openBadgeInfo(id) {
    const b = window.__badgesAPI?.getBadgeById(id);
    if (!b) return;
    let modal = document.getElementById('badgeInfoModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'badgeInfoModal';
      modal.className = 'prof-modal';
      modal.innerHTML = `
        <div class="prof-modal-inner" style="text-align:center;max-width:280px">
          <div id="bimIcon" style="font-size:2.4rem;margin-bottom:6px"></div>
          <div id="bimLabel" style="font-weight:700;font-size:1.05rem;margin-bottom:4px"></div>
          <div id="bimRarity" style="font-size:11px;opacity:.6;margin-bottom:10px;text-transform:uppercase;letter-spacing:.08em"></div>
          <div id="bimDesc" style="font-size:13px;opacity:.8;margin-bottom:8px"></div>
          <div id="bimHowTo" style="font-size:12px;background:rgba(255,255,255,.07);border-radius:8px;padding:8px 10px;margin-bottom:14px;display:none"></div>
          <button class="prof-save-btn" id="bimClose" style="width:100%">close ✕</button>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById('bimClose').onclick = () => modal.classList.add('hidden');
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
    }
    const rarity = b.plate ? '⭐ Special' : b.anim ? '✨ Rare' : '● Common';
    document.getElementById('bimIcon').textContent  = b.icon;
    document.getElementById('bimLabel').textContent = b.label;
    document.getElementById('bimRarity').textContent = rarity;
    document.getElementById('bimDesc').textContent   = b.desc || '';
    const howToEl = document.getElementById('bimHowTo');
    if (b.howTo) {
      howToEl.innerHTML = `<b>🔓 How to unlock:</b><br>${b.howTo}`;
      howToEl.style.display = 'block';
    } else { howToEl.style.display = 'none'; }
    modal.classList.remove('hidden');
  }

  /** Toggle equip state of one badge tile WITHOUT re-rendering entire grid. */
  function _toggleBadgeTile(id, wrap) {
    local.equippedBadges = local.equippedBadges || [];
    if (local.equippedBadges.includes(id)) {
      local.equippedBadges = local.equippedBadges.filter(x => x !== id);
    } else {
      local.equippedBadges.push(id);
    }
    // Only re-stamp the one button's class — no full repaint
    const btn = wrap.querySelector(`.bp-tile[data-id="${id}"]`);
    if (btn) btn.classList.toggle('equipped', local.equippedBadges.includes(id));
    // Update the small preview row without touching picker
    paintBadges();
  }

  function paintBadges() {
    const row = document.getElementById('profBadgesRow'); if (!row) return;
    if (!local.equippedBadges?.length) { row.innerHTML = '<span class="prof-empty">no badges equipped</span>'; return; }
    if (!window.__badgesAPI) return;
    const { getBadgeById } = window.__badgesAPI;
    // Use DocumentFragment to batch DOM writes
    const frag = document.createDocumentFragment();
    local.equippedBadges.forEach(id => {
      const b = getBadgeById(id);
      if (!b) return;
      // No animated glow inside profile modal — CSS transform only
      const span = document.createElement('span');
      span.className = 'badge-chip';
      span.textContent = b.icon + ' ' + b.label;
      frag.appendChild(span);
    });
    row.innerHTML = '';
    row.appendChild(frag);
  }

  function paintBadgePicker() {
    const wrap = document.getElementById('badgePickerGrid'); if (!wrap) return;
    if (!window.__badgesAPI) {
      wrap.innerHTML = '<i style="opacity:.6">loading badges…</i>';
      setTimeout(paintBadgePicker, 500);
      return;
    }
    const earned = (window.__badgesAPI.getEarned ? window.__badgesAPI.getEarned() : []) || [];
    if (!earned.length) { wrap.innerHTML = '<i style="opacity:.6">earn some badges first 🥺</i>'; return; }

    // Skip full repaint if only equip state changed (toggle handles it above)
    if (_lastEarnedSnapshot === earned && wrap.children.length > 1) return;
    _lastEarnedSnapshot = earned;
    _badgePageCount = 1; // reset pages on fresh render

    requestAnimationFrame(() => {
      const visible = earned.slice(0, BADGE_PAGE_SIZE * _badgePageCount);
      const hasMore = earned.length > visible.length;

      const frag = document.createDocumentFragment();
      visible.forEach(id => {
        const equipped = local.equippedBadges?.includes(id);
        const html = _buildBpTile(id, equipped);
        if (!html) return;
        const tmp = document.createElement('template');
        tmp.innerHTML = html;
        const btn = tmp.content.firstElementChild;
        // Long-press / right-click → info; tap → equip toggle
        btn.addEventListener('click', (e) => {
          if (e.shiftKey || e.ctrlKey) { _openBadgeInfo(id); return; }
          _toggleBadgeTile(id, wrap);
        });
        btn.addEventListener('contextmenu', e => { e.preventDefault(); _openBadgeInfo(id); });
        frag.appendChild(btn);
      });

      if (hasMore) {
        const more = document.createElement('button');
        more.className = 'bp-tile bp-show-more';
        more.innerHTML = `<span>show more… (${earned.length - visible.length} left)</span>`;
        more.onclick = () => {
          _badgePageCount++;
          _lastEarnedSnapshot = null; // force repaint with more items
          paintBadgePicker();
        };
        frag.appendChild(more);
      }

      wrap.innerHTML = '';
      wrap.appendChild(frag);
    });
  }

  function showToast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  function saveProfile() {
    const db = window._natDB; if (!db) return alert('still loading…');
    const uid = db.getUID(); if (!uid) return alert('still connecting…');
    const lvl = window.getLevelInfo ? window.getLevelInfo() : { level: 1 };
    db.set(db.ref(db.db, 'userProfiles/' + uid), {
      name: local.name || '',
      pfp: local.pfp || '',
      plate: local.plate || 'paper',
      equippedBadges: local.equippedBadges || [],
      hideLevel: !!local.hideLevel,
      usePfpInGame: !!local.usePfpInGame,
      showPfp: !!local.showPfp,
      level: lvl.level,
      username: local.username || '',
      ts: Date.now(),
    }).then(() => {
      showToast('profile saved 💗');
      window.dispatchEvent(new CustomEvent('profile-saved', { detail: { uid } }));
    }).catch(e => alert('oops: ' + (e.message || e)));
  }

  function listen() {
    const tryListen = () => {
      const db = window._natDB; if (!db) { setTimeout(tryListen, 250); return; }
      const uid = db.getUID(); if (!uid) { setTimeout(tryListen, 250); return; }
      db.onValue(db.ref(db.db, 'userProfiles/' + uid), snap => {
        const p = snap.val() || {};
        local.name = p.name || local.name || '';
        if (p.pfp)    local.pfp  = p.pfp;
        if (p.plate)  local.plate = p.plate;
        if (p.username) local.username = p.username;
        if (Array.isArray(p.equippedBadges)) local.equippedBadges = p.equippedBadges;
        if (typeof p.hideLevel === 'boolean')   local.hideLevel   = p.hideLevel;
        if (typeof p.usePfpInGame === 'boolean') local.usePfpInGame = p.usePfpInGame;
        if (typeof p.showPfp === 'boolean')     local.showPfp     = p.showPfp;
        paintAll();
      });
    };
    tryListen();
    setInterval(paintLevel, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
