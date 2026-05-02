/* 👤 PROFILE — PFP, name, displayed badges, plate, hide-level toggle.
   Stored at userProfiles/$uid in Firebase.
   Section is also wired into the tab bar by tabs.js.
*/
(() => {
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
          <input id="profNameInput" class="prof-name-input" maxlength="30" placeholder="your name…">
          <div class="prof-level-line" id="profLevelLine">LVL — · 0 EXP</div>
          <div class="prof-badges-row" id="profBadgesRow"><span class="prof-empty">no badges equipped</span></div>
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
          <div class="prof-block-title">🏅 equip up to 3 badges</div>
          <div id="badgePickerGrid" class="badge-picker-grid"></div>
        </div>
      </div>
    `;
    document.querySelector('main').appendChild(sec);
    wire();
    listen();
  }

  let local = { name: '', pfp: '', plate: 'paper', equippedBadges: [], hideLevel: false, usePfpInGame: false, showPfp: false };

  function wire() {
    document.getElementById('profPfpEdit').onclick = () => document.getElementById('profPfpFile').click();
    document.getElementById('profPfpFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        local.pfp = await resize(f, 200);
        paintPfp();
      } catch { alert('couldn\'t read that image 😭'); }
    });
    document.getElementById('profSaveBtn').onclick = saveProfile;
    document.getElementById('profNameInput').addEventListener('input', e => { local.name = e.target.value.slice(0, 30); });
    document.getElementById('profHideLevel').addEventListener('change', e => { local.hideLevel = e.target.checked; });
    document.getElementById('profUsePfpInGame').addEventListener('change', e => { local.usePfpInGame = e.target.checked; });
    document.getElementById('profShowPfp').addEventListener('change', e => { local.showPfp = e.target.checked; });
    window.addEventListener('plate-changed', e => { local.plate = e.detail.plate; paintPlate(); });

    paintAll();
  }

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

  function paintAll() { paintPfp(); paintLevel(); paintPlates(); paintBadges(); paintBadgePicker(); paintPlate(); }

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

  function paintBadges() {
    const row = document.getElementById('profBadgesRow'); if (!row) return;
    if (!local.equippedBadges?.length) { row.innerHTML = '<span class="prof-empty">no badges equipped</span>'; return; }
    if (!window.__badgesAPI) { return; }
    const { getBadgeById } = window.__badgesAPI;
    row.innerHTML = local.equippedBadges.slice(0, 3).map(id => {
      const b = getBadgeById(id);
      if (!b) return '';
      return `<span class="badge-chip ${b.anim || ''}">${b.icon} ${b.label}</span>`;
    }).join('');
  }

  function paintBadgePicker() {
    const wrap = document.getElementById('badgePickerGrid'); if (!wrap) return;
    if (!window.__badgesAPI) { wrap.innerHTML = '<i style="opacity:.6">loading badges…</i>'; setTimeout(paintBadgePicker, 500); return; }
    const earned = (window.__badgesAPI.getEarned ? window.__badgesAPI.getEarned() : []) || [];
    if (!earned.length) { wrap.innerHTML = '<i style="opacity:.6">earn some badges first 🥺</i>'; return; }
    wrap.innerHTML = earned.map(id => {
      const b = window.__badgesAPI.getBadgeById(id);
      if (!b) return '';
      const equipped = local.equippedBadges?.includes(id);
      return `<button class="bp-tile ${equipped ? 'equipped' : ''}" data-id="${id}" title="${b.desc}">${b.icon} <span class="bp-lab">${b.label}</span></button>`;
    }).join('');
    wrap.querySelectorAll('.bp-tile').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.id;
        local.equippedBadges = local.equippedBadges || [];
        if (local.equippedBadges.includes(id)) {
          local.equippedBadges = local.equippedBadges.filter(x => x !== id);
        } else {
          if (local.equippedBadges.length >= 3) { showToast('max 3 equipped — unequip one first'); return; }
          local.equippedBadges.push(id);
        }
        paintBadgePicker();
        paintBadges();
      };
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
        if (p.pfp) local.pfp = p.pfp;
        if (p.plate) local.plate = p.plate;
        if (Array.isArray(p.equippedBadges)) local.equippedBadges = p.equippedBadges;
        if (typeof p.hideLevel === 'boolean') local.hideLevel = p.hideLevel;
        if (typeof p.usePfpInGame === 'boolean') local.usePfpInGame = p.usePfpInGame;
        if (typeof p.showPfp === 'boolean') local.showPfp = p.showPfp;
        paintAll();
      });
    };
    tryListen();

    setInterval(paintLevel, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
