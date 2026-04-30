/* 📸 PHOTO WALL — actual wall layout (frames on a wall) + double-tap heart + server hearts. */
(() => {
  let pendingDataUrl = null;
  let heartsCache = {}; // postId -> { count, mine }
  let entries = [];

  function build() {
    if (document.getElementById('photoWallSection')) return;
    const sec = document.createElement('section');
    sec.id = 'photoWallSection';
    sec.className = 'photowall-section pw-wall-section';
    sec.innerHTML = `
      <h2 class="section-title">📸 photo wall</h2>
      <p class="section-sub">post a pic + a sweet message · double-tap a frame to ❤️ it</p>
      <div class="pw-uploader">
        <input type="file" id="pwFile" accept="image/*" hidden>
        <button class="pw-pick" id="pwPickBtn">📁 pick image</button>
        <div class="pw-preview" id="pwPreview"></div>
        <input id="pwName" type="text" placeholder="your name (optional)" maxlength="30">
        <textarea id="pwCaption" placeholder='write something like "you are the best friend that…" 💌' maxlength="200" rows="2"></textarea>
        <button class="pw-post" id="pwPost" disabled>post 🌸</button>
      </div>

      <div class="pw-wall-bg">
        <div class="pw-wall-grid" id="pwGrid">
          <p class="loading-text" style="text-align:center;opacity:.6;grid-column:1/-1">walang pic pa… be the first 📸</p>
        </div>
      </div>
    `;
    document.querySelector('main').appendChild(sec);

    document.getElementById('pwPickBtn').onclick = () => document.getElementById('pwFile').click();
    document.getElementById('pwFile').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        pendingDataUrl = await resize(f, 600);
        document.getElementById('pwPreview').innerHTML = `<img src="${pendingDataUrl}">`;
        document.getElementById('pwPost').disabled = false;
      } catch (err) { alert('couldn\'t read that image 😭'); }
    });
    document.getElementById('pwPost').onclick = post;
    listen();
    listenHearts();
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
        res(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = rej;
      const r = new FileReader();
      r.onload = e => img.src = e.target.result;
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function post() {
    if (!pendingDataUrl) return;
    const db = window._natDB; if (!db) return alert('still loading…');
    const uid = db.getUID();
    if (!uid) return alert('still connecting to the server… try again in a sec');
    const cap = document.getElementById('pwCaption').value.trim();
    const name = (document.getElementById('pwName').value.trim() || 'anonymous friend').slice(0, 30);
    const node = db.push(db.ref(db.db, 'photoWall'));
    db.set(node, {
      img: pendingDataUrl,
      caption: cap,
      uid, name, ts: Date.now(),
    }).then(() => {
      document.getElementById('pwCaption').value = '';
      document.getElementById('pwName').value = '';
      document.getElementById('pwPreview').innerHTML = '';
      document.getElementById('pwFile').value = '';
      pendingDataUrl = null;
      document.getElementById('pwPost').disabled = true;
      if (window.bumpChallenge) window.bumpChallenge('photo1', 1);
      if (window.bumpQuest) window.bumpQuest('photo', 1);
      if (window.addExp) window.addExp(60, 'photo wall post');
    }).catch(e => alert('oops: ' + (e.message || e)));
  }

  function listen() {
    const db = window._natDB;
    if (!db) { setTimeout(listen, 200); return; }
    db.onValue(db.ref(db.db, 'photoWall'), snap => {
      const data = snap.val() || {};
      entries = Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.ts - a.ts);
      render();
    });
  }

  function listenHearts() {
    const db = window._natDB;
    if (!db) { setTimeout(listenHearts, 200); return; }
    db.onValue(db.ref(db.db, 'photoHearts'), snap => {
      const data = snap.val() || {};
      const myUID = db.getUID();
      heartsCache = {};
      Object.entries(data).forEach(([pid, byUid]) => {
        const ents = Object.entries(byUid || {});
        heartsCache[pid] = { count: ents.filter(([,v]) => v).length, mine: !!(myUID && byUid[myUID]) };
      });
      paintHearts();
    });
  }

  function safe(s) { return (s || '').replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c])); }

  function render() {
    const grid = document.getElementById('pwGrid');
    if (!grid) return;
    if (!entries.length) {
      grid.innerHTML = '<p class="loading-text" style="text-align:center;opacity:.6;grid-column:1/-1">walang pic pa… be the first 📸</p>';
      return;
    }
    const db = window._natDB;
    const myUID = db?.getUID();
    grid.innerHTML = entries.map((p, idx) => {
      const canDelete = (myUID && (myUID === p.uid || myUID === db.ADMIN_UID));
      const tilt = ((idx % 6) - 2.5) * 1.6;
      const h = heartsCache[p.id] || { count: 0, mine: false };
      return `
        <div class="pw-frame" data-id="${p.id}" style="transform:rotate(${tilt.toFixed(1)}deg)">
          <div class="pw-frame-inner">
            <img src="${p.img}" alt="">
            <div class="pw-tape pw-tape-l"></div>
            <div class="pw-tape pw-tape-r"></div>
            <span class="pw-bigheart">❤️</span>
          </div>
          <div class="pw-cap">${safe(p.caption)}</div>
          <div class="pw-meta">
            <span>— ${safe(p.name)}</span>
            <button class="pw-heart-btn ${h.mine ? 'on' : ''}" data-hid="${p.id}" title="heart this">
              ❤️ <span class="pw-heart-count">${h.count || 0}</span>
            </button>
          </div>
          ${canDelete ? `<button class="pw-del" data-id="${p.id}" title="delete">🗑</button>` : ''}
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.pw-del').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        if (!confirm('delete this post?')) return;
        db.remove(db.ref(db.db, 'photoWall/' + b.dataset.id)).catch(e => alert(e.message || e));
      };
    });
    grid.querySelectorAll('.pw-heart-btn').forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); toggleHeart(b.dataset.hid, b.closest('.pw-frame')); };
    });
    grid.querySelectorAll('.pw-frame').forEach(fr => bindDoubleTap(fr));
  }

  function paintHearts() {
    const grid = document.getElementById('pwGrid'); if (!grid) return;
    grid.querySelectorAll('.pw-frame').forEach(fr => {
      const id = fr.dataset.id;
      const h = heartsCache[id] || { count: 0, mine: false };
      const cnt = fr.querySelector('.pw-heart-count');
      const btn = fr.querySelector('.pw-heart-btn');
      if (cnt) cnt.textContent = h.count || 0;
      if (btn) btn.classList.toggle('on', !!h.mine);
    });
  }

  function toggleHeart(postId, frameEl) {
    const db = window._natDB; if (!db) return;
    const uid = db.getUID(); if (!uid) return;
    const h = heartsCache[postId] || { count: 0, mine: false };
    const path = `photoHearts/${postId}/${uid}`;
    if (h.mine) {
      db.remove(db.ref(db.db, path)).catch(()=>{});
    } else {
      db.set(db.ref(db.db, path), true).then(() => {
        if (frameEl) bigHeartPop(frameEl);
        if (window.addExp) window.addExp(2, 'photo heart');
      }).catch(()=>{});
    }
  }

  function bindDoubleTap(fr) {
    let last = 0;
    const onTap = () => {
      const now = Date.now();
      if (now - last < 320) {
        const id = fr.dataset.id;
        const h = heartsCache[id] || { mine: false };
        if (!h.mine) toggleHeart(id, fr);
        else bigHeartPop(fr);
      }
      last = now;
    };
    fr.addEventListener('click', onTap);
    fr.addEventListener('touchend', onTap);
  }
  function bigHeartPop(fr) {
    const big = fr.querySelector('.pw-bigheart'); if (!big) return;
    big.classList.remove('pop'); void big.offsetWidth;
    big.classList.add('pop');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
