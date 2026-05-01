/* 💎 VIP SYSTEM — admin grants per UID via Firebase: userVIP/$uid = true.
   VIP perks:
     · Diamond 💎 reaction added on messages
     · Custom MYTHIC plate auto-unlocked
     · VIP badge on messages
     · OP "Diamond Me" game character (handled in game.js if window.isVIP())
     · Adds a "diamond drop" screen FX when reacting
*/
(() => {
  let vipMap = {};

  function build() {
    listen();
    waitForAdmin();
  }

  function listen() {
    const tryListen = () => {
      const db = window._natDB; if (!db) { setTimeout(tryListen, 250); return; }
      db.onValue(db.ref(db.db, 'userVIP'), snap => {
        vipMap = snap.val() || {};
        window.dispatchEvent(new CustomEvent('vip-update'));
        renderVipList();
      });
    };
    tryListen();
  }

  window.isVIP = function(uid) {
    if (!uid) {
      const db = window._natDB; if (!db) return false;
      uid = db.getUID();
    }
    return !!vipMap[uid];
  };
  window.getVipMap = () => ({ ...vipMap });

  const OLD_ADMIN_UID = '8IumnftXW1gJCa4iNbicZ0M0LOg2';

  function isAdminUID(uid) {
    const db = window._natDB;
    return uid === (db && db.ADMIN_UID) || uid === OLD_ADMIN_UID;
  }

  function waitForAdmin() {
    const tryBuild = () => {
      const db = window._natDB; if (!db) { setTimeout(tryBuild, 300); return; }
      const uid = db.getUID();
      if (!uid) { setTimeout(tryBuild, 300); return; }
      if (!isAdminUID(uid)) return;
      buildAdminPanel();
    };
    tryBuild();
  }

  function buildAdminPanel() {
    if (document.getElementById('vipAdminBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'vipAdminBtn';
    btn.className = 'vip-admin-fab';
    btn.title = 'VIP admin panel';
    btn.textContent = '💎';
    btn.onclick = openPanel;
    document.body.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.id = 'vipAdminOverlay';
    overlay.className = 'vip-admin-overlay hidden';
    overlay.innerHTML = `
      <div class="vip-admin-box">
        <div class="vip-admin-head">
          <b>💎 VIP admin</b>
          <button id="vipAdminClose">×</button>
        </div>
        <p class="vip-admin-sub">Grant or revoke VIP for any UID. VIPs see exclusive perks site-wide.</p>
        <div class="vip-grant-row">
          <input id="vipGrantInput" placeholder="paste UID to grant…">
          <button id="vipGrantBtn">grant 💎</button>
        </div>
        <div class="vip-list" id="vipList"><i style="opacity:.6">no VIPs yet</i></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.onclick = e => { if (e.target === overlay) overlay.classList.add('hidden'); };
    document.getElementById('vipAdminClose').onclick = () => overlay.classList.add('hidden');
    document.getElementById('vipGrantBtn').onclick = () => {
      const v = document.getElementById('vipGrantInput').value.trim();
      if (!v) return;
      grant(v);
      document.getElementById('vipGrantInput').value = '';
    };
  }
  function openPanel() {
    document.getElementById('vipAdminOverlay')?.classList.remove('hidden');
    renderVipList();
  }
  function renderVipList() {
    const list = document.getElementById('vipList'); if (!list) return;
    const ents = Object.keys(vipMap || {});
    if (!ents.length) { list.innerHTML = '<i style="opacity:.6">no VIPs yet</i>'; return; }
    list.innerHTML = ents.map(uid => `
      <div class="vip-row">
        <code>${uid.slice(0, 22)}…</code>
        <button data-uid="${uid}" class="vip-revoke">revoke</button>
      </div>
    `).join('');
    list.querySelectorAll('.vip-revoke').forEach(b => b.onclick = () => revoke(b.dataset.uid));
  }
  function grant(uid) {
    const db = window._natDB; if (!db) return;
    db.set(db.ref(db.db, 'userVIP/' + uid), true).then(() => showToast('granted 💎'))
      .catch(e => alert(e.message || e));
  }
  function revoke(uid) {
    const db = window._natDB; if (!db) return;
    db.remove(db.ref(db.db, 'userVIP/' + uid)).then(() => showToast('revoked'))
      .catch(e => alert(e.message || e));
  }
  function showToast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  // Diamond drop screen FX (called by app.js when VIP reacts)
  window.diamondDropFX = function() {
    const fx = document.createElement('div'); fx.className = 'diamond-fx-layer';
    for (let i = 0; i < 18; i++) {
      const d = document.createElement('span'); d.className = 'diamond-fx';
      d.style.left = Math.random() * 100 + '%';
      d.style.animationDelay = (Math.random() * 0.4) + 's';
      d.style.fontSize = (16 + Math.random() * 24) + 'px';
      d.textContent = '💎';
      fx.appendChild(d);
    }
    document.body.appendChild(fx);
    setTimeout(() => fx.remove(), 2400);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
