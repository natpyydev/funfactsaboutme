/* 📖 GUESTBOOK — DRAGGABLE STICKY-NOTES WALL
   Existing entries (text-only) still appear with sensible defaults.
   New entries get color, x/y, rotation. Positions persist via gbPositions/$id.
*/
(() => {
  const STICKERS = ['🌸','💗','✨','🎀','🌷','💫','🍓','🦋','🌈','💖','🎂','🥺'];
  const COLORS   = ['#fff7b2','#ffd6e0','#d4f5d2','#cde6ff','#e9d8ff','#ffe2c8'];
  let picked = [];
  let posCache = {};
  let entriesCache = [];

  function build() {
    if (document.getElementById('guestbookSection')) return;
    const sec = document.createElement('section');
    sec.id = 'guestbookSection';
    sec.className = 'guestbook-section gb-wall-section';
    sec.innerHTML = `
      <h2 class="section-title">📖 sticky notes wall</h2>
      <p class="section-sub">drop a sticky · drag it around · stays in place for everyone 🌸</p>
      <div class="gb-form">
        <input id="gbName" type="text" placeholder="your name…" maxlength="30">
        <textarea id="gbText" rows="3" placeholder="say hi or leave a memory…" maxlength="300"></textarea>
        <div class="gb-stickers" id="gbStickers"></div>
        <div class="gb-color-row" id="gbColors"></div>
        <button id="gbPost" class="gb-post-btn">stick it 🖋</button>
      </div>
      <div class="gb-wall-wrap">
        <div id="gbWall" class="gb-wall">
          <p class="gb-empty loading-text" style="text-align:center;opacity:.6">no notes yet… 📖</p>
        </div>
      </div>
    `;
    document.querySelector('main').appendChild(sec);
    renderStickers();
    renderColors();
    document.getElementById('gbPost').onclick = post;
    listen();
    listenPositions();
  }

  let chosenColor = COLORS[0];
  function renderColors() {
    const c = document.getElementById('gbColors');
    c.innerHTML = COLORS.map(col =>
      `<button class="gb-col-tile ${col===chosenColor?'on':''}" style="background:${col}" data-c="${col}"></button>`
    ).join('');
    c.querySelectorAll('.gb-col-tile').forEach(b => b.onclick = () => {
      chosenColor = b.dataset.c;
      renderColors();
    });
  }

  function renderStickers() {
    const c = document.getElementById('gbStickers');
    c.innerHTML = STICKERS.map(s =>
      `<button class="gb-sticker ${picked.includes(s)?'picked':''}" data-s="${s}">${s}</button>`
    ).join('');
    c.querySelectorAll('.gb-sticker').forEach(b => {
      b.onclick = () => {
        const s = b.dataset.s;
        if (picked.includes(s)) picked = picked.filter(x => x !== s);
        else if (picked.length < 3) picked.push(s);
        renderStickers();
      };
    });
  }

  function post() {
    const name = (document.getElementById('gbName').value.trim() || 'anonymous friend').slice(0, 30);
    const text = document.getElementById('gbText').value.trim();
    if (!text) return alert('write something first 🥺');
    const db = window._natDB; if (!db) return;
    const uid = db.getUID(); if (!uid) return alert('still connecting…');
    const node = db.push(db.ref(db.db, 'guestbook'));
    const wall = document.getElementById('gbWall');
    const W = Math.max(1, wall.clientWidth - 220);
    const H = Math.max(220, wall.clientHeight - 220);
    db.set(node, {
      name, text: text.slice(0, 300),
      stickers: picked.slice(0, 3),
      uid, ts: Date.now(),
      color: chosenColor,
      x: Math.round(Math.random() * W),
      y: Math.round(Math.random() * H),
      rot: (Math.random() * 16 - 8).toFixed(1),
    }).then(() => {
        document.getElementById('gbText').value = '';
        picked = [];
        renderStickers();
        if (window.addExp) window.addExp(40, 'sticky note');
      })
      .catch(e => alert('oops: ' + (e.message || e)));
  }

  function safe(s) { return (s || '').replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c])); }

  function listen() {
    const db = window._natDB;
    if (!db) { setTimeout(listen, 200); return; }
    db.onValue(db.ref(db.db, 'guestbook'), snap => {
      const data = snap.val() || {};
      entriesCache = Object.entries(data).map(([id, v]) => ({ id, ...v }));
      render();
    });
  }
  function listenPositions() {
    const db = window._natDB;
    if (!db) { setTimeout(listenPositions, 200); return; }
    db.onValue(db.ref(db.db, 'gbPositions'), snap => {
      posCache = snap.val() || {};
      render();
    });
  }

  function render() {
    const wall = document.getElementById('gbWall');
    if (!wall) return;
    const arr = entriesCache.sort((a, b) => a.ts - b.ts);
    if (!arr.length) {
      wall.innerHTML = '<p class="gb-empty loading-text" style="text-align:center;opacity:.6">no notes yet… 📖</p>';
      return;
    }
    const db = window._natDB;
    const myUID = db?.getUID();
    const wallW = Math.max(360, wall.clientWidth);
    const wallH = Math.max(420, wall.clientHeight);

    wall.innerHTML = arr.map((p, idx) => {
      const pos = posCache[p.id] || {};
      const x = Number.isFinite(pos.x) ? pos.x : (Number.isFinite(p.x) ? p.x : ((idx * 90) % Math.max(60, wallW - 220)));
      const y = Number.isFinite(pos.y) ? pos.y : (Number.isFinite(p.y) ? p.y : (Math.floor(idx / Math.max(1, Math.floor(wallW / 220))) * 200));
      const rot = pos.rot != null ? pos.rot : (p.rot != null ? p.rot : ((idx % 5 - 2) * 2));
      const color = p.color || COLORS[idx % COLORS.length];
      const canDelete = (myUID && (myUID === p.uid || myUID === db.ADMIN_UID));
      const canDrag   = (myUID && (myUID === p.uid || myUID === db.ADMIN_UID));
      return `
        <div class="gb-note ${canDrag ? 'draggable' : ''}" data-id="${p.id}"
             style="left:${x}px;top:${y}px;background:${color};transform:rotate(${rot}deg)">
          ${(p.stickers || []).length ? `<div class="gb-stickers-row">${p.stickers.map(s => `<span>${s}</span>`).join('')}</div>` : ''}
          <div class="gb-text">${safe(p.text)}</div>
          <div class="gb-meta">— ${safe(p.name)} · ${new Date(p.ts).toLocaleDateString()}</div>
          ${canDelete ? `<button class="gb-del" data-id="${p.id}">🗑</button>` : ''}
          ${canDrag   ? `<span class="gb-drag-handle" title="drag">↕</span>` : ''}
        </div>
      `;
    }).join('');

    wall.querySelectorAll('.gb-del').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        if (!confirm('delete this note?')) return;
        db.remove(db.ref(db.db, 'guestbook/' + b.dataset.id)).catch(e => alert(e.message || e));
        db.remove(db.ref(db.db, 'gbPositions/' + b.dataset.id)).catch(()=>{});
      };
    });

    wall.querySelectorAll('.gb-note.draggable').forEach(el => bindDrag(el, wallW, wallH));
  }

  function bindDrag(el, wallW, wallH) {
    let startX = 0, startY = 0, origX = 0, origY = 0, dragging = false, raf = null;
    const id = el.dataset.id;
    const start = (clientX, clientY) => {
      dragging = true;
      startX = clientX; startY = clientY;
      origX = parseFloat(el.style.left) || 0;
      origY = parseFloat(el.style.top)  || 0;
      el.classList.add('dragging');
    };
    const move = (clientX, clientY) => {
      if (!dragging) return;
      const dx = clientX - startX, dy = clientY - startY;
      const nx = Math.max(0, Math.min((wallW - el.offsetWidth - 8), origX + dx));
      const ny = Math.max(0, Math.min(Math.max(220, wallH - el.offsetHeight - 8), origY + dy));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.left = nx + 'px';
        el.style.top  = ny + 'px';
      });
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      const x = parseFloat(el.style.left) || 0;
      const y = parseFloat(el.style.top)  || 0;
      const rot = parseFloat((el.style.transform.match(/rotate\(([-\d.]+)deg\)/) || [])[1] || 0);
      const db = window._natDB; if (!db) return;
      db.set(db.ref(db.db, 'gbPositions/' + id), { x, y, rot, ts: Date.now() }).catch(()=>{});
    };
    el.addEventListener('mousedown', e => { if (e.target.classList.contains('gb-del')) return; e.preventDefault(); start(e.clientX, e.clientY); });
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup',   end);
    el.addEventListener('touchstart', e => { const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchmove',  e => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchend',   end);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
