/* 📸 PHOTO WALL — wall layout + multi-emoji reactions (❤️ 🔥 😭 😆)
   Reactions stored at: photoReactions/{postId}/{emoji}/{uid} = true
   Hearts kept at: photoHearts/{postId}/{uid} (backward compat)
*/
(() => {
  const REACT_EMOJIS = ['❤️', '🔥', '😭', '😆'];
  let pendingDataUrl = null;
  let reactCache = {};      // postId -> { emoji -> { count, mine } }
  let reactSeedCache = {};  // postId -> { emoji -> seedCount }
  let entries = [];

  function build() {
    if (document.getElementById('photoWallSection')) return;
    const sec = document.createElement('section');
    sec.id = 'photoWallSection';
    sec.className = 'photowall-section pw-wall-section';
    sec.innerHTML = `
      <h2 class="section-title">📸 photo wall</h2>
      <p class="section-sub">post a pic + a sweet message · react to each frame</p>
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
      } catch { alert('couldn\'t read that image 😭'); }
    });
    document.getElementById('pwPost').onclick = post;
    listen();
    listenReactions();
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
    if (!uid) return alert('still connecting… try again in a sec');
    const cap  = document.getElementById('pwCaption').value.trim();
    const name = (document.getElementById('pwName').value.trim() || 'anonymous friend').slice(0, 30);
    const node = db.push(db.ref(db.db, 'photoWall'));
    db.set(node, { img: pendingDataUrl, caption: cap, uid, name, ts: Date.now() })
      .then(() => {
        document.getElementById('pwCaption').value = '';
        document.getElementById('pwName').value    = '';
        document.getElementById('pwPreview').innerHTML = '';
        document.getElementById('pwFile').value = '';
        pendingDataUrl = null;
        document.getElementById('pwPost').disabled = true;
        window.bumpChallenge?.('photo1', 1);
        window.bumpQuest?.('photo', 1);
        window.addExp?.(60, 'photo wall post');
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

  function listenReactions() {
    const db = window._natDB;
    if (!db) { setTimeout(listenReactions, 200); return; }
    const myUID = db.getUID();

    // Listen to multi-reactions
    db.onValue(db.ref(db.db, 'photoReactions'), snap => {
      const data = snap.val() || {};
      reactCache = {};
      Object.entries(data).forEach(([pid, byEmoji]) => {
        reactCache[pid] = {};
        Object.entries(byEmoji || {}).forEach(([emoji, byUid]) => {
          const ents = Object.entries(byUid || {});
          reactCache[pid][emoji] = {
            count: ents.filter(([, v]) => v).length,
            mine:  !!(myUID && byUid[myUID]),
          };
        });
      });
      // Also merge old ❤️ from photoHearts for backward compat
      paintReactions();
    });

    // Also keep reading old photoHearts for ❤️ compat
    db.onValue(db.ref(db.db, 'photoHearts'), snap => {
      const data = snap.val() || {};
      const myUID2 = db.getUID();
      Object.entries(data).forEach(([pid, byUid]) => {
        if (!reactCache[pid]) reactCache[pid] = {};
        if (!reactCache[pid]['❤️']) {
          const ents = Object.entries(byUid || {});
          reactCache[pid]['❤️'] = {
            count: ents.filter(([, v]) => v).length,
            mine:  !!(myUID2 && byUid[myUID2]),
          };
        }
      });
      paintReactions();
    });

    // Listen to admin-seeded reaction counts (no fake UIDs, no permission_denied)
    db.onValue(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/photoSeeds'), snap => {
      reactSeedCache = snap.val() || {};
      paintReactions();
    });
  }

  function safe(s) {
    return (s || '').replace(/[<>&"']/g, c =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function buildReactHTML(postId) {
    return REACT_EMOJIS.map(emoji => {
      const r    = reactCache[postId]?.[emoji] || { count: 0, mine: false };
      const seed = (reactSeedCache[postId]?.[emoji]) || 0;
      const total = r.count + seed;
      return `<button class="pw-react-btn ${r.mine ? 'on' : ''}" data-pid="${postId}" data-emoji="${emoji}">
        ${emoji}${total > 0 ? `<span class="pw-react-count">${total}</span>` : ''}
      </button>`;
    }).join('');
  }

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
      const canDelete = myUID && (myUID === p.uid ||
        (typeof isAdmin === 'function' ? isAdmin(myUID) : myUID === db.ADMIN_UID));
      const tilt = ((idx % 6) - 2.5) * 1.6;

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
          </div>
          <div class="pw-reactions" id="pw-react-${p.id}">
            ${buildReactHTML(p.id)}
          </div>
          ${canDelete ? `<button class="pw-del" data-id="${p.id}" title="delete">🗑</button>` : ''}
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.pw-del').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        if (!confirm('delete this post?')) return;
        const db2 = window._natDB;
        db2.remove(db2.ref(db2.db, 'photoWall/' + b.dataset.id)).catch(e => alert(e.message || e));
      };
    });

    grid.querySelectorAll('.pw-react-btn').forEach(b => {
      b.onclick = e => { e.stopPropagation(); toggleReaction(b.dataset.pid, b.dataset.emoji, b.closest('.pw-frame')); };
    });

    grid.querySelectorAll('.pw-frame').forEach(fr => bindDoubleTap(fr));
  }

  function paintReactions() {
    document.querySelectorAll('.pw-frame').forEach(fr => {
      const pid = fr.dataset.id;
      const container = fr.querySelector('.pw-reactions');
      if (!container) return;
      container.innerHTML = buildReactHTML(pid);
      container.querySelectorAll('.pw-react-btn').forEach(b => {
        b.onclick = e => { e.stopPropagation(); toggleReaction(b.dataset.pid, b.dataset.emoji, fr); };
      });
    });
  }

  function showReactError(msg) {
    let toast = document.getElementById('pwReactToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwReactToast';
      toast.style.cssText = [
        'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
        'background:rgba(40,10,60,.92)', 'color:#fff', 'padding:10px 18px',
        'border-radius:20px', 'font-size:13px', 'font-weight:600',
        'z-index:9999', 'pointer-events:none', 'transition:opacity .3s',
        'max-width:calc(100vw - 32px)', 'text-align:center',
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 4000);
  }

  function toggleReaction(postId, emoji, frameEl) {
    const db = window._natDB; if (!db) return;
    const uid = db.getUID();
    if (!uid) {
      showReactError('log in first to react! 👀');
      return;
    }

    const r = reactCache[postId]?.[emoji] || { mine: false };

    // Use new photoReactions path for all emojis
    const path = `photoReactions/${postId}/${emoji}/${uid}`;
    if (r.mine) {
      db.remove(db.ref(db.db, path)).catch(e => {
        if (e.code === 'PERMISSION_DENIED' || String(e).includes('PERMISSION_DENIED')) {
          showReactError('⚠️ reactions blocked — Firebase rules need updating. Add "photoReactions" to your security rules!');
        }
      });
    } else {
      db.set(db.ref(db.db, path), true).then(() => {
        bigReactPop(frameEl, emoji);
        window.addExp?.(2, 'photo reaction');
      }).catch(e => {
        if (e.code === 'PERMISSION_DENIED' || String(e).includes('PERMISSION_DENIED')) {
          showReactError('⚠️ reactions blocked — Firebase rules need updating. Add "photoReactions" to your security rules!');
        }
      });
    }

    // Also maintain backward-compat ❤️ in photoHearts
    if (emoji === '❤️') {
      const heartPath = `photoHearts/${postId}/${uid}`;
      if (r.mine) db.remove(db.ref(db.db, heartPath)).catch(() => {});
      else db.set(db.ref(db.db, heartPath), true).catch(() => {});
    }
  }

  function bindDoubleTap(fr) {
    let last = 0;
    const onTap = () => {
      const now = Date.now();
      if (now - last < 320) {
        toggleReaction(fr.dataset.id, '❤️', fr);
      }
      last = now;
    };
    fr.addEventListener('click', onTap);
    fr.addEventListener('touchend', onTap);
  }

  function bigReactPop(fr, emoji) {
    const big = fr?.querySelector('.pw-bigheart');
    if (!big) return;
    big.textContent = emoji;
    big.classList.remove('pop');
    void big.offsetWidth;
    big.classList.add('pop');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();

  // 🌱 Admin-only: seed fake reaction COUNTS for a photo wall post.
  // Stored at adminData/{ADMIN_UID}/photoSeeds/{postId}/{emoji} = count
  // Always uses canonical ADMIN_UID path (matches the listenReactions listener).
  // adminData is publicly readable so ALL users see the seeded counts.
  //
  // Usage:
  //   window._seedPhotoReactions('YOUR_POST_ID')
  //   window._seedPhotoReactions('YOUR_POST_ID', { '❤️': 200, '🔥': 80 })
  //   window._seedPhotoReactions('YOUR_POST_ID', null, true)  ← clear seeds
  window._seedPhotoReactions = function(postId, customCounts, clear) {
    var db = window._natDB;
    if (!postId) { _pwLog('pass a postId: _seedPhotoReactions("your-post-id")', 'warn'); return; }
    if (!db) { _pwLog('DB not ready — try again', 'warn'); return; }
    if (!db.isAdminNow || !db.isAdminNow()) { _pwLog('admin only 🔐  UID: ' + db.getUID(), 'error'); return; }
    var path = 'adminData/' + db.ADMIN_UID + '/photoSeeds/' + postId;
    if (clear) {
      return db.set(db.ref(db.db, path), null)
        .then(function() { _pwLog('✅ photo seeds cleared for ' + postId); })
        .catch(function(e) { _pwLog('Firebase error: ' + e.message, 'error'); throw e; });
    }
    var counts = customCounts || { '❤️': 48, '🔥': 27, '😭': 19, '😆': 14 };
    return db.set(db.ref(db.db, path), counts)
      .then(function() { _pwLog('✅ photo seeds set for ' + postId + ' — visible to all users live'); return counts; })
      .catch(function(e) { _pwLog('Firebase error: ' + e.message, 'error'); throw e; });
  };

  function _pwLog(msg, level) {
    if (window._natConsoleLog) { window._natConsoleLog(msg, level); return; }
    if (level === 'error') console.error('[_seedPhotoReactions]', msg);
    else if (level === 'warn') console.warn('[_seedPhotoReactions]', msg);
    else console.log('[_seedPhotoReactions]', msg);
  }
})();
