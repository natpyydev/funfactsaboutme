/* 📣 CHANNEL TAB — Instagram-style: admin posts only, everyone else reacts.
   Firebase path: channels/nat/posts/{pushId}
     post: { text, imageUrl?, ts, uid }
   Reactions: channels/nat/posts/{pushId}/reactions/{emoji} = count
   My reacts: channelMyReacts/{uid}/{postId} = emoji
*/
(() => {
  const CHANNEL_PATH = 'channels/nat/posts';
  const MY_REACT_PATH = 'channelMyReacts';
  const REACT_EMOJIS  = ['❤️', '🔥', '😭', '😍', '😆', '🥺'];
  const SEED_PATH     = 'adminData/{ADMIN}/channelSeeds';

  // ── channel seed (admin-only) ─────────────────────────────────────────────
  window._seedChannel = function(customSeeds, clear) {
    const db = window._natDB;
    if (!db) { log('DB not ready', 'warn'); return; }
    if (!db.isAdminNow?.()) { log('admin only 🔐  UID: ' + db.getUID(), 'error'); return; }
    const path = 'adminData/' + db.ADMIN_UID + '/channelSeeds';
    if (clear) {
      return db.set(db.ref(db.db, path), null)
        .then(() => log('✅ channel seeds cleared'))
        .catch(e => { log('Firebase error: ' + e.message, 'error'); throw e; });
    }
    const seeds = customSeeds || {};
    // Usage after seeding: seeds are keyed by postId, value = { '❤️': 50, '🔥': 30 }
    return db.set(db.ref(db.db, path), seeds)
      .then(() => log('✅ channel seeds set for ' + Object.keys(seeds).length + ' post(s)'))
      .catch(e => { log('Firebase error: ' + e.message, 'error'); throw e; });
  };

  function log(msg, level) {
    if (window._natConsoleLog) { window._natConsoleLog(msg, level); return; }
    if (level === 'error') console.error('[channel]', msg);
    else if (level === 'warn') console.warn('[channel]', msg);
    else console.log('[channel]', msg);
  }

  // ── build ──────────────────────────────────────────────────────────────────
  function buildChannelSection() {
    if (document.getElementById('channelSection')) return;
    const sec = document.createElement('section');
    sec.id = 'channelSection';
    sec.className = 'channel-section';
    sec.innerHTML = `
      <h2 class="section-title">📣 channel</h2>
      <p class="section-sub">nat's posts only — you can react 💗</p>

      <div id="channelAdminCompose" class="ch-compose hidden">
        <textarea id="chComposeText" class="ch-textarea" placeholder="what's on your mind…" rows="3" maxlength="500"></textarea>
        <div class="ch-compose-row">
          <input id="chComposeImage" type="text" class="ch-image-input" placeholder="image URL (optional)…">
          <button class="ch-post-btn" id="chPostBtn">📤 post</button>
        </div>
        <div id="chComposeStatus" class="ch-status"></div>
      </div>

      <div id="channelFeed" class="ch-feed">
        <p class="loading-text" style="text-align:center;opacity:.6">loading posts…</p>
      </div>
    `;
    document.querySelector('main').appendChild(sec);
    wireCompose();
    listenPosts();
  }

  // ── compose (admin only) ───────────────────────────────────────────────────
  function wireCompose() {
    const tryWire = () => {
      const db = window._natDB;
      if (!db || !db.getUID()) { setTimeout(tryWire, 300); return; }
      const compose = document.getElementById('channelAdminCompose');
      if (compose && db.isAdminNow?.()) compose.classList.remove('hidden');
      document.getElementById('chPostBtn')?.addEventListener('click', submitPost);
    };
    tryWire();
  }

  async function submitPost() {
    const db     = window._natDB;
    const uid    = db?.getUID();
    if (!db || !uid) return;
    if (!db.isAdminNow?.()) return;

    const text   = document.getElementById('chComposeText')?.value?.trim();
    const imgUrl = document.getElementById('chComposeImage')?.value?.trim();
    const status = document.getElementById('chComposeStatus');

    if (!text && !imgUrl) {
      if (status) status.textContent = 'write something first 😤';
      return;
    }
    if (status) status.textContent = 'posting…';

    const post = { text: text || '', ts: Date.now(), uid };
    if (imgUrl) post.imageUrl = imgUrl;

    try {
      await db.push(db.ref(db.db, CHANNEL_PATH), post);
      document.getElementById('chComposeText').value  = '';
      document.getElementById('chComposeImage').value = '';
      if (status) { status.textContent = '✅ posted!'; setTimeout(() => { if (status) status.textContent = ''; }, 2000); }
    } catch(e) {
      if (status) status.textContent = 'error: ' + e.message;
    }
  }

  // ── listen posts + seeds ───────────────────────────────────────────────────
  let _posts    = {};   // postId -> post data
  let _seeds    = {};   // postId -> { emoji -> seedCount }
  let _myReacts = {};   // postId -> emoji
  let _db       = null;

  function listenPosts() {
    const tryListen = () => {
      const db = window._natDB;
      if (!db || !db.getUID()) { setTimeout(tryListen, 300); return; }
      _db = db;
      const uid = db.getUID();

      // Posts
      db.onValue(db.ref(db.db, CHANNEL_PATH), snap => {
        _posts = snap.val() || {};
        renderFeed();
      });

      // Seeds
      db.onValue(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/channelSeeds'), snap => {
        _seeds = snap.val() || {};
        renderFeed();
      });

      // My reacts
      db.onValue(db.ref(db.db, MY_REACT_PATH + '/' + uid), snap => {
        _myReacts = snap.val() || {};
        renderFeed();
      });
    };
    tryListen();
  }

  // ── render ─────────────────────────────────────────────────────────────────
  function renderFeed() {
    const feed = document.getElementById('channelFeed');
    if (!feed || !_db) return;

    const entries = Object.entries(_posts).sort((a,b) => (b[1].ts||0) - (a[1].ts||0));

    if (!entries.length) {
      feed.innerHTML = '<p class="loading-text" style="text-align:center;opacity:.6">no posts yet — check back later 👀</p>';
      return;
    }

    feed.innerHTML = entries.map(([postId, post]) => {
      const date  = new Date(post.ts || 0);
      const when  = date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const isAdmin = _db.isAdminNow?.();

      const reactsHTML = REACT_EMOJIS.map(em => {
        const count = (post.reactions?.[em] || 0) + (_seeds[postId]?.[em] || 0);
        const mine  = _myReacts[postId] === em;
        return `<button class="ch-react-btn ${mine ? 'ch-react-active' : ''}"
                        data-post="${postId}" data-emoji="${em}"
                        onclick="window._chReact('${postId}','${em}')">
          ${em}<span class="ch-react-count">${count > 0 ? count : ''}</span>
        </button>`;
      }).join('');

      return `
        <div class="ch-post" data-post-id="${postId}">
          ${isAdmin ? `<button class="ch-delete-btn" onclick="window._chDelete('${postId}')" title="delete post">🗑</button>` : ''}
          ${post.imageUrl ? `<div class="ch-post-img-wrap"><img src="${post.imageUrl}" alt="" class="ch-post-img" loading="lazy"></div>` : ''}
          ${post.text ? `<div class="ch-post-text">${escapeHtml(post.text)}</div>` : ''}
          <div class="ch-post-meta">${when}</div>
          <div class="ch-reacts">${reactsHTML}</div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── react ──────────────────────────────────────────────────────────────────
  window._chReact = function(postId, emoji) {
    const db  = _db || window._natDB;
    const uid = db?.getUID();
    if (!db || !uid) return;

    const prev = _myReacts[postId];

    // Optimistic local update
    if (prev === emoji) {
      delete _myReacts[postId];
    } else {
      _myReacts[postId] = emoji;
    }
    renderFeed();

    const myRef = db.ref(db.db, MY_REACT_PATH + '/' + uid + '/' + postId);

    if (prev === emoji) {
      // un-react
      db.runTransaction(db.ref(db.db, CHANNEL_PATH + '/' + postId + '/reactions/' + emoji), v => Math.max(0,(v||0)-1));
      db.remove(myRef).catch(()=>{});
    } else {
      // switch/add
      if (prev) db.runTransaction(db.ref(db.db, CHANNEL_PATH + '/' + postId + '/reactions/' + prev), v => Math.max(0,(v||0)-1));
      db.runTransaction(db.ref(db.db, CHANNEL_PATH + '/' + postId + '/reactions/' + emoji), v => (v||0)+1);
      db.set(myRef, emoji).catch(()=>{});
    }
  };

  // ── delete (admin) ─────────────────────────────────────────────────────────
  window._chDelete = function(postId) {
    const db = _db || window._natDB;
    if (!db?.isAdminNow?.()) return;
    if (!confirm('delete this post?')) return;
    db.remove(db.ref(db.db, CHANNEL_PATH + '/' + postId)).catch(e => alert('error: ' + e.message));
    db.remove(db.ref(db.db, 'adminData/' + db.ADMIN_UID + '/channelSeeds/' + postId)).catch(()=>{});
  };

  // ── seed convenience: seed a specific post by its latest push ID ───────────
  window._seedChannelPost = function(postId, counts, clear) {
    const db = window._natDB;
    if (!db?.isAdminNow?.()) { log('admin only', 'error'); return; }
    if (!postId) {
      log('Usage: _seedChannelPost("postId", { "❤️": 100, "🔥": 50 })', 'warn');
      // List all current post IDs to help admin
      log('Current posts: ' + Object.keys(_posts).join(', '), 'info');
      return;
    }
    const path = 'adminData/' + db.ADMIN_UID + '/channelSeeds/' + postId;
    if (clear) {
      return db.set(db.ref(db.db, path), null).then(() => log('✅ seed cleared for ' + postId));
    }
    const data = counts || { '❤️': 48, '🔥': 27, '😭': 19, '😍': 14, '😆': 8, '🥺': 6 };
    return db.set(db.ref(db.db, path), data)
      .then(() => log('✅ channel post seeded: ' + postId));
  };

  // ── list post IDs (handy for admin) ──────────────────────────────────────
  window._listChannelPosts = function() {
    const entries = Object.entries(_posts).sort((a,b) => (b[1].ts||0)-(a[1].ts||0));
    if (!entries.length) { log('No posts yet', 'warn'); return; }
    entries.forEach(([id, p]) => log(`[${id}] — "${(p.text||'(image only)').slice(0,50)}"`));
    return entries.map(([id]) => id);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildChannelSection);
  else buildChannelSection();
})();
