/* ═══════════════════════════════════════════════════════════════════
   PROFESSIONAL MODE — CINEMATIC GALLERY ORB
   professional-gallery-orb.js

   Integrates the existing photowall.js Firebase data + reactions
   into a cinematic world-space experience:
   • Floating holographic orb access point in the page world
   • Zoom transition into gallery
   • Glassmorphism floating cards
   • All original photowall data, reactions, upload, delete preserved
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!document.title.includes('Professional')) return;

  /* ── CONSTANTS ────────────────────────────────────────────────── */
  const REACT_EMOJIS = ['❤️', '🔥', '😭', '😆'];

  /* ── STATE ────────────────────────────────────────────────────── */
  let entries       = [];
  let reactCache    = {};
  let reactSeeds    = {};
  let currentIdx    = 0;
  let pendingDataUrl = null;
  let pendingFile    = null;
  let isOpen        = false;
  let isAnimating   = false;

  /* ══════════════════════════════════════════════════════════════
     1.  INJECT ORB INTO PROFESSIONAL MODE WORLD
  ══════════════════════════════════════════════════════════════ */
  function injectOrb () {
    // Find the right place — after the stats section, before contact
    const sectionsEl = document.getElementById('sections');
    if (!sectionsEl) return;

    // Find the stats section (3rd .section), insert orb section after it
    const allSections = sectionsEl.querySelectorAll('.section');
    const statsSec = allSections[2] || allSections[allSections.length - 1];

    const anchor = document.createElement('section');
    anchor.className = 'section pgal-orb-anchor';
    anchor.id = 'pgal-world-anchor';
    anchor.setAttribute('aria-label', 'Gallery Access Point');
    anchor.innerHTML = `
      <!-- World-space ORB -->
      <div class="pgal-orb-wrap" id="pgal-orb" title="Enter Gallery">
        <!-- Outer rings -->
        <div class="pgal-orb-ring pgal-orb-ring-1"></div>
        <div class="pgal-orb-ring pgal-orb-ring-2"></div>
        <div class="pgal-orb-ring pgal-orb-ring-3"></div>
        <!-- Floating particles -->
        <div class="pgal-orb-particles">
          <div class="pgal-orb-particle"></div>
          <div class="pgal-orb-particle"></div>
          <div class="pgal-orb-particle"></div>
          <div class="pgal-orb-particle"></div>
          <div class="pgal-orb-particle"></div>
          <div class="pgal-orb-particle"></div>
          <div class="pgal-orb-particle"></div>
          <div class="pgal-orb-particle"></div>
        </div>
        <!-- Core sphere -->
        <div class="pgal-orb-core">
          <div class="pgal-orb-icon">📷</div>
        </div>
      </div>
      <span class="pgal-orb-label">Photo Wall · Access Point</span>
    `;

    if (statsSec) {
      statsSec.insertAdjacentElement('afterend', anchor);
    } else {
      const footer = sectionsEl.querySelector('footer');
      if (footer) footer.insertAdjacentElement('beforebegin', anchor);
      else sectionsEl.appendChild(anchor);
    }

    document.getElementById('pgal-orb').addEventListener('click', handleOrbClick);
  }

  /* ══════════════════════════════════════════════════════════════
     2.  ZOOM TRANSITION
  ══════════════════════════════════════════════════════════════ */
  let zoomVeil = null;

  function getVeil () {
    if (!zoomVeil) {
      zoomVeil = document.createElement('div');
      zoomVeil.className = 'pgal-zoom-veil';
      zoomVeil.id = 'pgal-zoom-veil';
      document.body.appendChild(zoomVeil);
    }
    return zoomVeil;
  }

  function handleOrbClick (e) {
    if (isAnimating || isOpen) return;
    isAnimating = true;

    // Set veil origin to click position
    const vx = ((e.clientX / window.innerWidth) * 100).toFixed(1) + '%';
    const vy = ((e.clientY / window.innerHeight) * 100).toFixed(1) + '%';
    const veil = getVeil();
    veil.style.setProperty('--ox', vx);
    veil.style.setProperty('--oy', vy);
    veil.classList.remove('pgal-zoom-in', 'pgal-zoom-hold', 'pgal-zoom-out');

    requestAnimationFrame(() => {
      veil.classList.add('pgal-zoom-in');
    });

    // After zoom completes, open gallery
    setTimeout(() => {
      openGallery();
      // Dissolve veil
      setTimeout(() => {
        veil.classList.add('pgal-zoom-hold');
        veil.classList.remove('pgal-zoom-in');
        setTimeout(() => {
          veil.classList.add('pgal-zoom-out');
          veil.classList.remove('pgal-zoom-hold');
          isAnimating = false;
        }, 60);
      }, 200);
    }, 620);
  }

  /* ══════════════════════════════════════════════════════════════
     3.  GALLERY DOM
  ══════════════════════════════════════════════════════════════ */
  function buildGalleryDOM () {
    if (document.getElementById('pgal-backdrop')) return;

    // Backdrop
    const bd = document.createElement('div');
    bd.id = 'pgal-backdrop';
    bd.className = 'pgal-backdrop';
    document.body.appendChild(bd);

    // Scene
    const scene = document.createElement('div');
    scene.id = 'pgal-scene';
    scene.className = 'pgal-scene';
    scene.innerHTML = `
      <!-- Header -->
      <div class="pgal-header">
        <div class="pgal-header-title">Photo Wall · Gallery</div>
        <button class="pgal-close-btn" id="pgal-close">[ Close ]</button>
      </div>

      <!-- Nav: prev -->
      <div class="pgal-nav pgal-nav-left">
        <button class="pgal-nav-btn" id="pgal-prev">‹</button>
      </div>

      <!-- Card Stage -->
      <div class="pgal-stage" id="pgal-stage">
        <div class="pgal-card" id="pgal-card">
          <div class="pgal-card-corner-br"></div>
          <div class="pgal-img-wrap" id="pgal-img-wrap">
            <img id="pgal-img" src="" alt="">
            <div class="pgal-img-gradient"></div>
            <div class="pgal-reactions-bar" id="pgal-reactions-bar"></div>
            <div class="pgal-bigheart" id="pgal-bigheart"></div>
          </div>
          <button class="pgal-del-btn" id="pgal-del-btn" style="display:none">🗑</button>
          <div class="pgal-card-body">
            <div class="pgal-post-meta">
              <div class="pgal-post-name" id="pgal-post-name"></div>
              <div class="pgal-post-ts" id="pgal-post-ts"></div>
            </div>
            <div class="pgal-post-caption" id="pgal-post-caption"></div>
          </div>
        </div>
      </div>

      <!-- Nav: next -->
      <div class="pgal-nav pgal-nav-right">
        <button class="pgal-nav-btn" id="pgal-next">›</button>
      </div>

      <!-- Counter & dots -->
      <div class="pgal-counter" id="pgal-counter">
        <div id="pgal-counter-text">1 / 1</div>
        <div class="pgal-progress-dots" id="pgal-dots"></div>
      </div>

      <!-- Upload panel -->
      <div class="pgal-upload-panel">
        <div class="pgal-upload-row">
          <input type="file" id="pgal-file-input" accept="image/*" hidden>
          <button class="pgal-upload-btn" id="pgal-pick-btn">📁 Pick Image</button>
          <img class="pgal-preview-thumb" id="pgal-preview-thumb" src="" alt="">
          <input class="pgal-post-input" id="pgal-name-input" type="text" placeholder="your name (optional)" maxlength="30">
          <input class="pgal-post-input" id="pgal-cap-input" type="text" placeholder="write a caption 💌" maxlength="200">
          <button class="pgal-upload-btn" id="pgal-post-btn" disabled>Post 🌸</button>
        </div>
      </div>
    `;
    document.body.appendChild(scene);

    // Wire events
    document.getElementById('pgal-close').addEventListener('click', closeGallery);
    bd.addEventListener('click', closeGallery);
    document.getElementById('pgal-prev').addEventListener('click', () => navigate(-1));
    document.getElementById('pgal-next').addEventListener('click', () => navigate(1));
    document.getElementById('pgal-pick-btn').addEventListener('click', () => {
      document.getElementById('pgal-file-input').click();
    });
    document.getElementById('pgal-file-input').addEventListener('change', handleFilePick);
    document.getElementById('pgal-post-btn').addEventListener('click', handlePost);
    document.getElementById('pgal-del-btn').addEventListener('click', handleDelete);

    // Keyboard nav
    document.addEventListener('keydown', onKeyDown);

    // Double-tap/click to ❤️
    const imgWrap = document.getElementById('pgal-img-wrap');
    let lastTap = 0;
    const heartTap = () => {
      const now = Date.now();
      if (now - lastTap < 340 && entries[currentIdx]) {
        toggleReaction(entries[currentIdx].id, '❤️');
      }
      lastTap = now;
    };
    imgWrap.addEventListener('click', heartTap);
    imgWrap.addEventListener('touchend', heartTap);
  }

  function onKeyDown (e) {
    if (!isOpen) return;
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === 'Escape')     closeGallery();
  }

  /* ══════════════════════════════════════════════════════════════
     4.  OPEN / CLOSE
  ══════════════════════════════════════════════════════════════ */
  function openGallery () {
    buildGalleryDOM();
    isOpen = true;
    document.body.style.overflow = 'hidden';

    const bd    = document.getElementById('pgal-backdrop');
    const scene = document.getElementById('pgal-scene');
    bd.classList.add('pgal-active');

    requestAnimationFrame(() => {
      scene.classList.add('pgal-active');
      renderCurrentCard(true);
    });

    // Start listening to Firebase if not already
    listenFirebase();
  }

  function closeGallery () {
    if (!isOpen) return;
    isOpen = false;
    document.body.style.overflow = '';

    const bd    = document.getElementById('pgal-backdrop');
    const scene = document.getElementById('pgal-scene');
    scene.classList.remove('pgal-active');
    bd.classList.remove('pgal-active');
  }

  /* ══════════════════════════════════════════════════════════════
     5.  NAVIGATION
  ══════════════════════════════════════════════════════════════ */
  function navigate (dir) {
    if (!entries.length) return;
    const card = document.getElementById('pgal-card');

    // Slide out
    card.classList.remove('pgal-card-visible');
    card.classList.add(dir > 0 ? 'pgal-card-exit-left' : 'pgal-card-exit-right');

    setTimeout(() => {
      currentIdx = (currentIdx + dir + entries.length) % entries.length;
      card.classList.remove('pgal-card-exit-left', 'pgal-card-exit-right');
      renderCurrentCard(true);
    }, 280);
  }

  /* ══════════════════════════════════════════════════════════════
     6.  RENDER
  ══════════════════════════════════════════════════════════════ */
  function renderCurrentCard (animate) {
    const card = document.getElementById('pgal-card');
    if (!card) return;

    if (!entries.length) {
      // Empty state
      const stage = document.getElementById('pgal-stage');
      stage.innerHTML = `
        <div class="pgal-empty">
          <div class="pgal-empty-icon">📷</div>
          <div>No photos yet</div>
          <div style="font-size:9px;opacity:.6">Be the first to post</div>
        </div>
      `;
      document.getElementById('pgal-counter').style.display = 'none';
      document.getElementById('pgal-prev').disabled = true;
      document.getElementById('pgal-next').disabled = true;
      return;
    }

    const p = entries[currentIdx];
    if (!p) return;

    const db    = window._natDB;
    const myUID = db?.getUID();

    // Image
    document.getElementById('pgal-img').src = p.img || '';

    // Meta
    document.getElementById('pgal-post-name').textContent = p.name || 'anonymous friend';
    document.getElementById('pgal-post-ts').textContent   = p.ts ? formatTs(p.ts) : '';
    document.getElementById('pgal-post-caption').textContent = p.caption || '';

    // Delete button
    const delBtn = document.getElementById('pgal-del-btn');
    const canDel = myUID && (
      myUID === p.uid ||
      (db && myUID === db.ADMIN_UID) ||
      (typeof isAdmin === 'function' && isAdmin(myUID))
    );
    delBtn.style.display = canDel ? 'block' : 'none';

    // Reactions bar
    renderReactions(p.id);

    // Counter + dots
    document.getElementById('pgal-counter-text').textContent =
      (currentIdx + 1) + ' / ' + entries.length;
    renderDots();

    // Nav buttons
    document.getElementById('pgal-prev').disabled = entries.length <= 1;
    document.getElementById('pgal-next').disabled = entries.length <= 1;

    // Animate in
    if (animate) {
      requestAnimationFrame(() => {
        card.classList.add('pgal-card-visible');
      });
    }
  }

  function renderReactions (postId) {
    const bar = document.getElementById('pgal-reactions-bar');
    if (!bar) return;
    bar.innerHTML = REACT_EMOJIS.map(emoji => {
      const r    = reactCache[postId]?.[emoji] || { count: 0, mine: false };
      const seed = reactSeeds[postId]?.[emoji] || 0;
      const total = r.count + seed;
      return `<button class="pgal-react-btn ${r.mine ? 'on' : ''}"
                data-pid="${postId}" data-emoji="${emoji}">
        ${emoji}${total > 0 ? `<span class="pgal-react-count">${total}</span>` : ''}
      </button>`;
    }).join('');

    bar.querySelectorAll('.pgal-react-btn').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        toggleReaction(b.dataset.pid, b.dataset.emoji);
      });
    });
  }

  function renderDots () {
    const dotsEl = document.getElementById('pgal-dots');
    if (!dotsEl) return;
    const max = Math.min(entries.length, 9);
    const offset = entries.length > max
      ? Math.max(0, Math.min(currentIdx - Math.floor(max / 2), entries.length - max))
      : 0;

    dotsEl.innerHTML = Array.from({ length: Math.min(entries.length, max) }, (_, i) => {
      const active = (i + offset) === currentIdx;
      return `<div class="pgal-dot ${active ? 'pgal-dot-active' : ''}"></div>`;
    }).join('');
  }

  function formatTs (ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* ══════════════════════════════════════════════════════════════
     7.  FIREBASE LISTENERS  (reuse photowall paths exactly)
  ══════════════════════════════════════════════════════════════ */
  let _listeningFB = false;

  function listenFirebase () {
    const db = window._natDB;
    if (!db) { setTimeout(listenFirebase, 250); return; }
    if (_listeningFB) return;
    _listeningFB = true;

    const myUID = db.getUID();

    // Main photo wall data
    db.onValue(db.ref(db.db, 'photoWall'), snap => {
      const data = snap.val() || {};
      entries = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.ts - a.ts);
      currentIdx = Math.min(currentIdx, Math.max(0, entries.length - 1));
      if (isOpen) renderCurrentCard(false);
    });

    // Multi-reactions (photoReactions)
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
      if (isOpen) renderReactions(entries[currentIdx]?.id);
    });

    // Legacy ❤️ from photoHearts
    db.onValue(db.ref(db.db, 'photoHearts'), snap => {
      const data = snap.val() || {};
      const uid2 = db.getUID();
      Object.entries(data).forEach(([pid, byUid]) => {
        if (!reactCache[pid]) reactCache[pid] = {};
        if (!reactCache[pid]['❤️']) {
          const ents = Object.entries(byUid || {});
          reactCache[pid]['❤️'] = {
            count: ents.filter(([, v]) => v).length,
            mine:  !!(uid2 && byUid[uid2]),
          };
        }
      });
      if (isOpen) renderReactions(entries[currentIdx]?.id);
    });

    // Admin seeds
    db.onValue(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/photoSeeds'), snap => {
      reactSeeds = snap.val() || {};
      if (isOpen) renderReactions(entries[currentIdx]?.id);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     8.  REACTIONS  (mirrors photowall.js toggleReaction exactly)
  ══════════════════════════════════════════════════════════════ */
  function toggleReaction (postId, emoji) {
    const db = window._natDB; if (!db) return;
    const uid = db.getUID();
    if (!uid) {
      showToast('Log in first to react! 👀');
      return;
    }

    const r = reactCache[postId]?.[emoji] || { mine: false };
    const path = `photoReactions/${postId}/${emoji}/${uid}`;

    if (r.mine) {
      db.remove(db.ref(db.db, path)).catch(e => {
        if (String(e).includes('PERMISSION_DENIED'))
          showToast('⚠️ Reactions blocked — Firebase rules need updating.');
      });
    } else {
      db.set(db.ref(db.db, path), true).then(() => {
        bigHeartPop(emoji);
        window.addExp?.(2, 'photo reaction');
      }).catch(e => {
        if (String(e).includes('PERMISSION_DENIED'))
          showToast('⚠️ Reactions blocked — Firebase rules need updating.');
      });
    }

    // Backward compat ❤️
    if (emoji === '❤️') {
      const hp = `photoHearts/${postId}/${uid}`;
      if (r.mine) db.remove(db.ref(db.db, hp)).catch(() => {});
      else db.set(db.ref(db.db, hp), true).catch(() => {});
    }
  }

  function bigHeartPop (emoji) {
    const bh = document.getElementById('pgal-bigheart');
    if (!bh) return;
    bh.textContent = emoji;
    bh.classList.remove('pop');
    void bh.offsetWidth;
    bh.classList.add('pop');
  }

  /* ══════════════════════════════════════════════════════════════
     9.  UPLOAD / POST  (mirrors photowall.js exactly)
  ══════════════════════════════════════════════════════════════ */
  function handleFilePick (e) {
    const f = e.target.files[0];
    if (!f) return;
    pendingFile = f;
    resizeImage(f, 600).then(url => {
      pendingDataUrl = url;
      const thumb = document.getElementById('pgal-preview-thumb');
      thumb.src = url;
      thumb.classList.add('pgal-has-img');
      document.getElementById('pgal-post-btn').disabled = false;
    }).catch(() => showToast('Couldn\'t read that image 😭'));
    e.target.value = '';
  }

  function handlePost () {
    if (!pendingDataUrl) return;
    const db = window._natDB;
    if (!db) { showToast('Still loading…'); return; }
    const uid = db.getUID();
    if (!uid) { showToast('Still connecting… try again in a sec'); return; }

    const cap  = (document.getElementById('pgal-cap-input').value || '').trim();
    const name = (document.getElementById('pgal-name-input').value.trim() || 'anonymous friend').slice(0, 30);
    const node = db.push(db.ref(db.db, 'photoWall'));

    db.set(node, { img: pendingDataUrl, caption: cap, uid, name, ts: Date.now() })
      .then(() => {
        document.getElementById('pgal-cap-input').value  = '';
        document.getElementById('pgal-name-input').value = '';
        const thumb = document.getElementById('pgal-preview-thumb');
        thumb.src = '';
        thumb.classList.remove('pgal-has-img');
        document.getElementById('pgal-file-input').value = '';
        pendingDataUrl = null;
        pendingFile    = null;
        document.getElementById('pgal-post-btn').disabled = true;
        window.bumpChallenge?.('photo1', 1);
        window.bumpQuest?.('photo', 1);
        window.addExp?.(60, 'photo wall post');
        showToast('Posted! 🌸');
      })
      .catch(e => showToast('Oops: ' + (e.message || e)));
  }

  function handleDelete () {
    if (!entries[currentIdx]) return;
    if (!confirm('Delete this post?')) return;
    const db = window._natDB;
    if (!db) return;
    db.remove(db.ref(db.db, 'photoWall/' + entries[currentIdx].id))
      .catch(e => showToast(e.message || String(e)));
  }

  function resizeImage (file, maxDim) {
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

  /* ══════════════════════════════════════════════════════════════
     10.  TOAST
  ══════════════════════════════════════════════════════════════ */
  function showToast (msg) {
    // Use ProMode.toast if available, else fallback
    if (window.ProMode?.toast) {
      window.ProMode.toast(msg);
      return;
    }
    let t = document.getElementById('pgal-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pgal-toast';
      Object.assign(t.style, {
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 5, 15, 0.92)',
        border: '1px solid rgba(0,220,255,0.25)',
        color: 'rgba(0,220,255,0.85)',
        padding: '10px 20px',
        borderRadius: '2px',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '11px',
        letterSpacing: '2px',
        zIndex: '999999',
        pointerEvents: 'none',
        transition: 'opacity .3s',
        backdropFilter: 'blur(12px)',
      });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.style.opacity = '0'; }, 3500);
  }

  /* ══════════════════════════════════════════════════════════════
     11.  INIT
  ══════════════════════════════════════════════════════════════ */
  function init () {
    injectOrb();
    // Start Firebase listener eagerly so data is ready when gallery opens
    const tryListen = () => {
      if (window._natDB) listenFirebase();
      else setTimeout(tryListen, 300);
    };
    tryListen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
