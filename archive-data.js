/**
 * archive-data.js — Archive Data Layer + Owner Upload System
 *
 * Owns: static entries, Firebase votes, Storage uploads, owner modal, FAB.
 * NO separate patch files needed.
 *
 * Requires:  window._natDB      (app2.js)
 *            window.currentUID  (app2.js auth)
 * Images:    uploaded via ImgBB free API (no Firebase Storage needed)
 *
 * Load order: app2.js → firebase-extensions.js → archive-data.js → archive.js
 *
 * Firebase paths:
 *   archive/entries/{id}            → entry metadata (owner write, public read)
 *   archive/voteCounts/{id}/agree   → number (public read, auth write via transaction)
 *   archive/voteCounts/{id}/disagree
 *   archive/votes/{id}/{uid}        → { type, ts }  (user writes own)
 *   archive/overrides/{id}          → { agree, disagree } (owner only)
 *   Storage: archive/{id}/cover.jpg
 */
(function () {
  'use strict';

  // All admin UIDs — same list used in Firebase rules and app2.js isAdmin()
  const OWNER_UIDS = [
    'zNDEej9J3kg79fUYxJjxLqrXJpz2',
    'FfSIOOqNV6NTqb4eKV8RbAARDm33',
    '8IumnftXW1gJCa4iNbicZ0M0LOg2',
  ];

  function isOwner() {
    if (window.__NAT_ARCHIVE_OWNER__ === true) return true;
    // Use app2.js isAdmin() if available (single source of truth)
    if (typeof window._natDB?.isAdmin === 'function') return window._natDB.isAdmin();
    const current = window.currentUID || window._natCurrentUID;
    return OWNER_UIDS.includes(current);
  }

  // Archive entries come entirely from Firebase Realtime Database.
  // No static/hardcoded entries — everything is managed via the upload modal.
  let _entries = [];

  const fdb = () => window._natDB || null;
  const uid = () => window.currentUID || window._natCurrentUID || null;

  // ─── FIREBASE ENTRY LISTENER ──────────────────────────────────────
  function listenEntries() {
    const d = fdb(); if (!d) return;
    d.onValue(d.ref(d.db, 'archive/entries'), snap => {
      const raw = snap.val();
      if (!raw) {
        _entries = [];
        window.dispatchEvent(new CustomEvent('archiveEntriesUpdated'));
        return;
      }
      _entries = Object.entries(raw)
        .map(([id, data]) => ({
          id,
          ...data,
          tags: Array.isArray(data.tags) ? data.tags : [], // always an array
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || b.rating - a.rating);
      window.dispatchEvent(new CustomEvent('archiveEntriesUpdated'));
    });
  }

  // ─── VOTES ────────────────────────────────────────────────────────
  async function vote(entryId, type) {
    const d = fdb(), u = uid();
    if (!d || !u) return _voteLocal(entryId, type);
    const vr   = d.ref(d.db, `archive/votes/${entryId}/${u}`);
    const snap = await d.get(vr);
    if (snap.exists()) return { success: false, reason: 'already-voted' };
    await d.set(vr, { type, ts: Date.now() });
    await d.runTransaction(d.ref(d.db, `archive/voteCounts/${entryId}/${type}`), v => (v || 0) + 1);
    localStorage.setItem(`nat-archive-vote-${entryId}`, type);
    return { success: true };
  }

  function _voteLocal(entryId, type) {
    const k = `nat-archive-vote-${entryId}`;
    if (localStorage.getItem(k)) return Promise.resolve({ success: false, reason: 'already-voted' });
    localStorage.setItem(k, type);
    window.dispatchEvent(new CustomEvent('archiveVote', { detail: { entryId, type } }));
    return Promise.resolve({ success: true });
  }

  async function getUserVote(entryId) {
    const d = fdb(), u = uid();
    if (d && u) {
      const snap = await d.get(d.ref(d.db, `archive/votes/${entryId}/${u}`));
      if (snap.exists()) return snap.val().type;
    }
    return localStorage.getItem(`nat-archive-vote-${entryId}`) || null;
  }

  async function getVotes(entryId) {
    try {
      const ov = await getOverride(entryId);
      if (ov && typeof ov.agree === 'number') return ov;
      const d = fdb();
      if (d) {
        const snap = await d.get(d.ref(d.db, `archive/voteCounts/${entryId}`));
        const val  = snap.val() || {};
        return { agree: val.agree || 0, disagree: val.disagree || 0 };
      }
      const entry = _entries.find(e => e.id === entryId);
      const local = localStorage.getItem(`nat-archive-vote-${entryId}`);
      return {
        agree:    (entry?.agreeCount    || 0) + (local === 'agree'    ? 1 : 0),
        disagree: (entry?.disagreeCount || 0) + (local === 'disagree' ? 1 : 0),
      };
    } catch {
      return { agree: 0, disagree: 0 };
    }
  }

  function subscribeVotes(entryId, cb) {
    const d = fdb();
    if (d) {
      const cr = d.ref(d.db, `archive/voteCounts/${entryId}`);
      const or = d.ref(d.db, `archive/overrides/${entryId}`);
      const u1 = d.onValue(cr, async () => cb(await getVotes(entryId)));
      const u2 = d.onValue(or, async () => cb(await getVotes(entryId)));
      return () => { try { u1(); u2(); } catch {} };
    }
    const h = async (e) => { if (e.detail?.entryId === entryId || e.type === 'archiveOverride') cb(await getVotes(entryId)); };
    window.addEventListener('archiveVote', h);
    window.addEventListener('archiveOverride', h);
    return () => { window.removeEventListener('archiveVote', h); window.removeEventListener('archiveOverride', h); };
  }

  async function override(entryId, agree, disagree) {
    if (!isOwner()) return false;
    const d = fdb();
    if (d) { await d.set(d.ref(d.db, `archive/overrides/${entryId}`), { agree, disagree }); return true; }
    const s = JSON.parse(localStorage.getItem('nat-archive-overrides') || '{}');
    s[entryId] = { agree, disagree };
    localStorage.setItem('nat-archive-overrides', JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('archiveOverride', { detail: { entryId, agree, disagree } }));
    return true;
  }

  async function getOverride(entryId) {
    const d = fdb();
    if (d) { const snap = await d.get(d.ref(d.db, `archive/overrides/${entryId}`)); return snap.exists() ? snap.val() : null; }
    return JSON.parse(localStorage.getItem('nat-archive-overrides') || '{}')[entryId] || null;
  }

  // ─── IMAGE COMPRESSION ────────────────────────────────────────────
  function compressImage(file) {
    return new Promise((res, rej) => {
      const MAX = 1200, Q = 0.82, url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height / width * MAX); width = MAX; }
          else { width = Math.round(width / height * MAX); height = MAX; }
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(img, 0, 0, width, height);
        c.toBlob(b => {
          if (!b) { rej(new Error('Compression failed')); return; }
          res(new File([b], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', Q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Image load failed')); };
      img.src = url;
    });
  }

  // ─── ADD / DELETE ENTRY ───────────────────────────────────────────
  // ─── IMGBB UPLOAD (free, no Storage plan needed) ─────────────────
  // Store your key in Firebase Realtime Database at:
  //   /config/imgbbKey   (string value)
  // This keeps it out of your source code.
  // Fallback: hardcode here if you prefer (key is client-safe by ImgBB design).
  const IMGBB_KEY_FALLBACK = 'f7bd43842dabcc91564d025ea69fe575';

  async function getImgBBKey() {
    const d = fdb();
    if (d) {
      try {
        const snap = await d.get(d.ref(d.db, 'config/imgbbKey'));
        if (snap.exists()) return snap.val();
      } catch {}
    }
    return IMGBB_KEY_FALLBACK;
  }

  async function uploadImageToImgBB(file, onProgress) {
    const key = await getImgBBKey();
    if (!key) throw new Error('ImgBB API key not configured.');

    if (onProgress) onProgress(10);
    const compressed = await compressImage(file);
    if (onProgress) onProgress(25);

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(compressed);
    });
    if (onProgress) onProgress(45);

    const form = new FormData();
    form.append('key',   key);
    form.append('image', base64);
    form.append('name',  `archive-${Date.now()}`);

    if (onProgress) onProgress(55);

    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    if (onProgress) onProgress(90);

    if (!res.ok) throw new Error(`ImgBB ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (!json.success) throw new Error('ImgBB failed: ' + JSON.stringify(json.error));
    if (onProgress) onProgress(100);

    // ImgBB URL priority:
    // json.data.url         → direct CDN image URL  (most reliable for <img src>)
    // json.data.medium.url  → resized medium, different CDN path (bypasses some hotlink blocks)
    // json.data.display_url → same as url usually
    const d = json.data;
    const imageURL = d.url || d.medium?.url || d.display_url;
    console.log('[Archive] ImgBB URLs:', { url: d.url, medium: d.medium?.url, display: d.display_url });
    if (!imageURL) throw new Error('ImgBB returned no usable URL');
    return imageURL;
  }

  async function addEntry(data, file, onProgress) {
    if (!isOwner()) return { success: false, reason: 'not-owner' };
    const d = fdb();
    if (!d) return { success: false, reason: 'database-not-ready' };

    try {
      const id = (data.title || 'entry')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
        + '-' + Date.now().toString(36);

      // imageURL: pre-resolved from URL paste, or uploaded from file
      let imageURL = data.imageURL || '';
      if (!imageURL && file) {
        imageURL = await uploadImageToImgBB(file, onProgress);
        console.log('[Archive] Image uploaded:', imageURL);
      }


      const entry = {
        id,
        title:      data.title || 'Untitled',
        rating:     parseFloat(data.rating) || 0,
        opinion:    data.opinion || '',
        image:      imageURL,
        tags:       typeof data.tags === 'string'
                      ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
                      : (data.tags || []),
        year:       data.year ? parseInt(data.year, 10) : null,
        agreeCount: 0, disagreeCount: 0,
        createdAt:  Date.now(),
      };

      await d.set(d.ref(d.db, `archive/entries/${id}`), entry);
      console.log('[Archive] Entry saved:', id);

      // ── Immediately update local state so the UI refreshes right away.
      // The Firebase onValue listener will also fire shortly after,
      // but this gives instant feedback without waiting for the round-trip.
      _entries = [entry, ..._entries.filter(e => e.id !== id)];
      window.dispatchEvent(new CustomEvent('archiveEntriesUpdated'));

      return { success: true, id };

    } catch (err) {
      console.error('[Archive] addEntry error:', err);
      return { success: false, reason: err.message };
    }
  }

  async function deleteEntry(id) {
    if (!isOwner()) return false;
    const d = fdb(); if (!d) return false;
    try {
      await Promise.all([
        d.remove(d.ref(d.db, `archive/entries/${id}`)),
        d.remove(d.ref(d.db, `archive/voteCounts/${id}`)),
        d.remove(d.ref(d.db, `archive/votes/${id}`)),
        d.remove(d.ref(d.db, `archive/overrides/${id}`)),
      ]);
    } catch (err) {
      console.error('[Archive] deleteEntry error:', err);
      return false;
    }
    // Update local state immediately — don't wait for Firebase listener
    _entries = _entries.filter(e => e.id !== id);
    window.dispatchEvent(new CustomEvent('archiveEntriesUpdated'));
    return true;
  }

  async function editEntry(id, patch) {
    if (!isOwner()) return { success: false, reason: 'not-owner' };
    const d = fdb(); if (!d) return { success: false, reason: 'no-db' };
    try {
      // Normalize tags if provided as a string
      if (typeof patch.tags === 'string') {
        patch.tags = patch.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
      // Write each changed field individually (partial update)
      const updates = {};
      ['title','rating','opinion','image','tags','year'].forEach(k => {
        if (patch[k] !== undefined) updates[k] = patch[k];
      });
      if (updates.rating !== undefined) updates.rating = parseFloat(updates.rating) || 0;
      if (updates.year   !== undefined) updates.year   = updates.year ? parseInt(updates.year, 10) : null;
      updates.updatedAt = Date.now();

      await Promise.all(
        Object.entries(updates).map(([k, v]) =>
          d.set(d.ref(d.db, `archive/entries/${id}/${k}`), v)
        )
      );
      // Update local state immediately
      const idx = _entries.findIndex(e => e.id === id);
      if (idx !== -1) Object.assign(_entries[idx], updates);
      window.dispatchEvent(new CustomEvent('archiveEntriesUpdated'));
      return { success: true };
    } catch (err) {
      console.error('[Archive] editEntry error:', err);
      return { success: false, reason: err.message };
    }
  }

  // ─── UPLOADER CSS ─────────────────────────────────────────────────
  function injectUploaderCSS() {
    if (document.getElementById('arcUploaderCSS')) return;
    const s = document.createElement('style');
    s.id = 'arcUploaderCSS';
    s.textContent = `
.aup-bd{position:fixed;inset:0;z-index:10600;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:16px;box-sizing:border-box;overflow-y:auto;-webkit-overflow-scrolling:touch}
.aup-bd.aup-gone{display:none}
.aup-modal{width:100%;max-width:480px;background:#0e0f15;border:1px solid rgba(255,255,255,0.1);border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.7);display:flex;flex-direction:column;max-height:88vh;overflow-y:auto;-webkit-overflow-scrolling:touch}
.aup-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.07)}
.aup-head-l{display:flex;align-items:center;gap:10px}
.aup-head-icon{font-size:20px;color:var(--arc-accent,#d4af7a)}.aup-head-title{font-size:14px;font-weight:700;color:#e8e8f0}.aup-head-sub{font-size:10px;color:rgba(232,232,240,0.4);letter-spacing:.08em;text-transform:uppercase;margin-top:1px}
.aup-close{width:30px;height:30px;border:1px solid rgba(255,255,255,0.12);background:none;color:#aaa;border-radius:8px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center}
.aup-close:hover{color:#fff;border-color:#fff}
.aup-dz{margin:14px 18px 0;border:2px dashed rgba(255,255,255,0.15);border-radius:14px;min-height:130px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;background:rgba(255,255,255,0.02);transition:all .2s}
.aup-dz:hover,.aup-dz:focus,.aup-dz.drag{border-color:var(--arc-accent,#d4af7a);background:rgba(212,175,122,0.05);outline:none}
.aup-dz.loaded{border-style:solid;border-color:rgba(212,175,122,0.4);min-height:180px}
.aup-dz-inner{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;pointer-events:none;user-select:none}
.aup-dz-icon{font-size:28px;opacity:.55}.aup-dz-lbl{font-size:12px;font-weight:600;color:rgba(232,232,240,0.6)}.aup-dz-sub{font-size:10px;color:rgba(232,232,240,0.35)}
.aup-dz-preview{width:100%;height:180px;object-fit:cover;border-radius:12px;pointer-events:none}
.aup-fi{margin:8px 18px 0;display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(212,175,122,0.08);border:1px solid rgba(212,175,122,0.2);border-radius:8px;font-size:11px}
.aup-fi.gone{display:none}.aup-fi-name{flex:1;font-weight:600;color:var(--arc-accent,#d4af7a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aup-fi-size{color:rgba(232,232,240,0.45);flex-shrink:0}
.aup-fi-rm{width:22px;height:22px;border:1px solid rgba(248,113,113,0.3);background:rgba(248,113,113,0.12);border-radius:5px;color:#f87171;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.aup-fi-rm:hover{background:rgba(248,113,113,0.25)}
.aup-fields{display:flex;flex-direction:column;gap:10px;padding:14px 18px 0}
.aup-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.aup-field{display:flex;flex-direction:column;gap:4px}
.aup-lbl{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(232,232,240,0.4)}
.aup-input{padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e8e8f0;font-size:16px;font-family:inherit;outline:none;transition:border-color .2s;box-sizing:border-box;-webkit-appearance:none;width:100%}
.aup-input:focus{border-color:rgba(212,175,122,0.5);background:rgba(212,175,122,0.04)}.aup-input::placeholder{color:rgba(232,232,240,0.25)}
.aup-ta{resize:vertical;min-height:72px;line-height:1.5}.aup-cc{font-size:10px;color:rgba(232,232,240,0.3);text-align:right;margin-top:-2px}.aup-hint{font-size:10px;color:rgba(232,232,240,0.3);margin-top:-2px}
.aup-img-tabs{display:flex;gap:6px;margin-top:4px;margin-bottom:8px}
.aup-img-tab{flex:1;padding:7px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(232,232,240,0.6);transition:all .2s;text-align:center}
.aup-img-tab.active{background:rgba(212,175,122,0.15);border-color:rgba(212,175,122,0.4);color:var(--arc-accent,#d4af7a)}
.aup-url-preview-wrap{margin-top:8px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)}
.aup-url-preview{width:100%;max-height:160px;object-fit:cover;display:block}
@media(max-width:600px){.aup-bd{padding:0;align-items:flex-end}.aup-modal{max-width:100%;border-radius:20px 20px 0 0;max-height:96vh}}
.aup-prog{margin:12px 18px 0;display:flex;align-items:center;gap:8px}.aup-prog.gone{display:none}
.aup-prog-lbl{font-size:11px;font-weight:600;color:rgba(232,232,240,0.6);min-width:90px}
.aup-prog-track{flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden}
.aup-prog-fill{height:100%;background:linear-gradient(90deg,var(--arc-accent,#d4af7a),#e8d8b4);border-radius:99px;transition:width .25s ease}
.aup-prog-pct{font-size:11px;font-weight:700;color:var(--arc-accent,#d4af7a);min-width:30px;text-align:right}
.aup-err{margin:8px 18px 0;padding:8px 12px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.28);border-radius:8px;font-size:11px;color:#f87171}.aup-err.gone{display:none}
.aup-footer{display:flex;gap:8px;padding:14px 18px 18px;justify-content:flex-end}
.aup-cancel{padding:9px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:9px;color:rgba(232,232,240,0.6);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}.aup-cancel:hover{background:rgba(255,255,255,0.09);color:#e8e8f0}
.aup-submit{padding:9px 20px;background:linear-gradient(135deg,rgba(212,175,122,0.28),rgba(212,175,122,0.16));border:1px solid rgba(212,175,122,0.5);border-radius:9px;color:var(--arc-accent,#d4af7a);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;letter-spacing:.02em}
.aup-submit:hover:not(:disabled){background:linear-gradient(135deg,rgba(212,175,122,0.42),rgba(212,175,122,0.26));box-shadow:0 0 20px rgba(212,175,122,0.2)}.aup-submit:disabled{opacity:.5;cursor:not-allowed}
.arc-fab{position:fixed;bottom:86px;right:18px;display:flex;align-items:center;gap:8px;padding:13px 18px;background:linear-gradient(135deg,rgba(212,175,122,0.28),rgba(212,175,122,0.14));border:1.5px solid rgba(212,175,122,0.55);border-radius:999px;color:var(--arc-accent,#d4af7a);font-size:13px;font-weight:700;cursor:pointer;z-index:9500;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 4px 28px rgba(0,0,0,0.5),0 0 0 1px rgba(212,175,122,0.12) inset;transition:transform .2s ease,box-shadow .2s ease;white-space:nowrap;-webkit-tap-highlight-color:transparent;touch-action:manipulation;min-width:44px;min-height:44px}
.arc-fab__icon{font-size:20px;line-height:1}
.arc-fab:hover{transform:translateY(-2px);box-shadow:0 8px 36px rgba(212,175,122,0.35)}
.arc-fab:active{transform:scale(0.95)}
@media(max-width:600px){
  .arc-fab__label{display:none}
  .arc-fab{bottom:88px;right:16px;padding:0;border-radius:50%;width:56px;height:56px;justify-content:center;align-items:center}
  .arc-fab__icon{font-size:22px}
  .aup-row{grid-template-columns:1fr}
  .aup-footer{flex-direction:column-reverse}
  .aup-cancel,.aup-submit{width:100%;text-align:center;justify-content:center;padding:13px}
  .aup-modal{border-radius:16px 16px 0 0;position:fixed;bottom:0;left:0;right:0;max-width:100%;max-height:92vh}
  .aup-bd{align-items:flex-end;padding:0}
}`;
    document.head.appendChild(s);
  }

  // ─── UPLOADER MODAL ───────────────────────────────────────────────
  let _uploading = false, _file = null, _prevURL = null;

  function openUploader() {
    injectUploaderCSS();
    let wrap = document.getElementById('arcUploaderWrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'arcUploaderWrap'; document.body.appendChild(wrap); }
    _file = null; _prevURL = null; _uploading = false;
    wrap.innerHTML = `
      <div class="aup-bd" id="aupBd">
        <div class="aup-modal">
          <div class="aup-head">
            <div class="aup-head-l"><span class="aup-head-icon">⊕</span><div><div class="aup-head-title">New Archive Entry</div><div class="aup-head-sub">Owner · Upload</div></div></div>
            <button class="aup-close" id="aupClose">✕</button>
          </div>

          <div class="aup-fields">
            <div class="aup-field"><label class="aup-lbl">Title *</label><input class="aup-input" id="aupTitle" type="text" placeholder="e.g. Blade Runner 2049" maxlength="80"/></div>
            <div class="aup-row">
              <div class="aup-field"><label class="aup-lbl">Rating /10 *</label><input class="aup-input" id="aupRating" type="number" min="0" max="10" step="0.1" placeholder="9.2"/></div>
              <div class="aup-field"><label class="aup-lbl">Year</label><input class="aup-input" id="aupYear" type="number" min="1888" max="2099" placeholder="2017"/></div>
            </div>
            <div class="aup-field"><label class="aup-lbl">Opinion *</label><textarea class="aup-input aup-ta" id="aupOpinion" rows="3" maxlength="280" placeholder="Your honest take…"></textarea><div class="aup-cc"><span id="aupOpinionCount">0</span>/280</div></div>
            <div class="aup-field"><label class="aup-lbl">Tags</label><input class="aup-input" id="aupTags" type="text" placeholder="film, cinema, favorites"/><div class="aup-hint">Comma-separated</div></div>

            <div class="aup-field">
              <label class="aup-lbl">Cover Image *</label>
              <div class="aup-img-tabs">
                <button class="aup-img-tab active" id="aupTabUrl" type="button">🔗 Paste URL</button>
                <button class="aup-img-tab" id="aupTabFile" type="button">📁 Upload File</button>
              </div>

              <div id="aupUrlPanel">
                <input class="aup-input" id="aupImageUrl" type="url"
                  placeholder="https://i.imgur.com/... or any direct image URL"/>
                <div class="aup-hint">Use Imgur, Discord, Google Photos, or any direct .jpg/.png link</div>
                <div class="aup-url-preview-wrap" id="aupUrlPreviewWrap" style="display:none">
                  <img id="aupUrlPreview" class="aup-url-preview" alt="preview" referrerpolicy="no-referrer"/>
                </div>
              </div>

              <div id="aupFilePanel" style="display:none">
                <div class="aup-dz" id="aupDz" tabindex="0" role="button" aria-label="Upload image">
                  <div class="aup-dz-inner" id="aupDzIn"><div class="aup-dz-icon">🎞</div><div class="aup-dz-lbl">Tap or drag image here</div><div class="aup-dz-sub">auto-compressed · ImgBB free hosting</div></div>
                  <img class="aup-dz-preview" id="aupPreview" alt="" style="display:none"/>
                  <input type="file" id="aupFileIn" accept="image/*" capture="environment" style="display:none" aria-hidden="true"/>
                </div>
                <div class="aup-fi gone" id="aupFi"><span class="aup-fi-name" id="aupFiName">—</span><span class="aup-fi-size" id="aupFiSize">—</span><button class="aup-fi-rm" id="aupFiRm" type="button">✕</button></div>
              </div>
            </div>
          </div>

          <div class="aup-prog gone" id="aupProg"><div class="aup-prog-lbl" id="aupProgLbl">Uploading…</div><div class="aup-prog-track"><div class="aup-prog-fill" id="aupProgFill" style="width:0%"></div></div><div class="aup-prog-pct" id="aupProgPct">0%</div></div>
          <div class="aup-err gone" id="aupErr"></div>
          <div class="aup-footer"><button class="aup-cancel" id="aupCancel">Cancel</button><button class="aup-submit" id="aupSubmit"><span id="aupSubmitLbl">Publish Entry</span></button></div>
        </div>
      </div>`;

    // ── Tab switching: URL vs File ──
    let _imgMode = 'url'; // 'url' | 'file'
    document.getElementById('aupTabUrl').addEventListener('click', () => {
      _imgMode = 'url';
      document.getElementById('aupTabUrl').classList.add('active');
      document.getElementById('aupTabFile').classList.remove('active');
      document.getElementById('aupUrlPanel').style.display = '';
      document.getElementById('aupFilePanel').style.display = 'none';
    });
    document.getElementById('aupTabFile').addEventListener('click', () => {
      _imgMode = 'file';
      document.getElementById('aupTabFile').classList.add('active');
      document.getElementById('aupTabUrl').classList.remove('active');
      document.getElementById('aupFilePanel').style.display = '';
      document.getElementById('aupUrlPanel').style.display = 'none';
    });

    // ── URL preview ──
    let _urlPreviewTimer;
    document.getElementById('aupImageUrl').addEventListener('input', e => {
      clearTimeout(_urlPreviewTimer);
      _urlPreviewTimer = setTimeout(() => {
        const url = e.target.value.trim();
        const wrap = document.getElementById('aupUrlPreviewWrap');
        const img  = document.getElementById('aupUrlPreview');
        if (!url) { wrap.style.display = 'none'; return; }
        img.src = url;
        img.onload  = () => { wrap.style.display = ''; _err(''); };
        img.onerror = () => { wrap.style.display = 'none'; if (url) _err('Could not load image from that URL. Try a different link.'); };
      }, 600);
    });

    // ── File upload ──
    const dz = document.getElementById('aupDz'), fin = document.getElementById('aupFileIn');
    dz.addEventListener('click', e => { if (!e.target.closest('.aup-fi-rm')) fin.click(); });
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fin.click(); } });
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); const f = e.dataTransfer?.files[0]; if (f) _handleFile(f); });
    fin.addEventListener('change', e => { if (e.target.files[0]) _handleFile(e.target.files[0]); });
    document.getElementById('aupFiRm').addEventListener('click', e => { e.stopPropagation(); _clearFile(); });

    const op = document.getElementById('aupOpinion');
    op.addEventListener('input', () => { document.getElementById('aupOpinionCount').textContent = op.value.length; });
    document.getElementById('aupClose').addEventListener('click',  closeUploader);
    document.getElementById('aupCancel').addEventListener('click', closeUploader);
    document.getElementById('aupSubmit').addEventListener('click', () => _submit(_imgMode));
    document.getElementById('aupBd').addEventListener('click', e => { if (e.target === e.currentTarget) closeUploader(); });
    document.addEventListener('keydown', _escUp);

    const bd = document.getElementById('aupBd');
    bd.style.opacity = '0';
    requestAnimationFrame(() => { bd.style.transition = 'opacity .3s ease'; bd.style.opacity = '1'; });
    document.body.style.overflow = 'hidden';
  }

  function closeUploader() {
    document.removeEventListener('keydown', _escUp);
    if (_prevURL) { URL.revokeObjectURL(_prevURL); _prevURL = null; }
    const bd = document.getElementById('aupBd'); if (!bd) return;
    bd.style.transition = 'opacity .25s ease'; bd.style.opacity = '0';
    setTimeout(() => { const w = document.getElementById('arcUploaderWrap'); if (w) w.innerHTML = ''; document.body.style.overflow = ''; }, 280);
  }

  function _escUp(e) { if (e.key === 'Escape') closeUploader(); }

  async function _handleFile(raw) {
    if (!raw.type.startsWith('image/')) { _err('Please select an image file.'); return; }
    if (_prevURL) { URL.revokeObjectURL(_prevURL); _prevURL = null; }
    try {
      _prog(true); _progVal(10, 'Compressing…');
      _file = await compressImage(raw);
      _progVal(100, 'Ready'); setTimeout(() => _prog(false), 600);
      _prevURL = URL.createObjectURL(_file);
      const pv = document.getElementById('aupPreview'), di = document.getElementById('aupDzIn'), fi = document.getElementById('aupFi');
      if (pv) { pv.src = _prevURL; pv.style.display = 'block'; }
      if (di) di.style.display = 'none';
      document.getElementById('aupDz').classList.add('loaded');
      if (fi) fi.classList.remove('gone');
      document.getElementById('aupFiName').textContent = _file.name;
      document.getElementById('aupFiSize').textContent = `${(_file.size / 1024).toFixed(0)} KB`;
      _err('');
    } catch (e) { _err('Compression failed: ' + e.message); _prog(false); }
  }

  function _clearFile() {
    _file = null;
    if (_prevURL) { URL.revokeObjectURL(_prevURL); _prevURL = null; }
    const pv = document.getElementById('aupPreview'), di = document.getElementById('aupDzIn');
    const fi = document.getElementById('aupFi'), dz = document.getElementById('aupDz'), fin = document.getElementById('aupFileIn');
    if (pv) { pv.src = ''; pv.style.display = 'none'; }
    if (di) di.style.display = '';
    if (fi) fi.classList.add('gone');
    if (dz) dz.classList.remove('loaded');
    if (fin) fin.value = '';
  }

  function _prog(v) { const el = document.getElementById('aupProg'); if (el) el.classList.toggle('gone', !v); }
  function _progVal(pct, lbl) {
    const f = document.getElementById('aupProgFill'), p = document.getElementById('aupProgPct'), l = document.getElementById('aupProgLbl');
    if (f) f.style.width = `${pct}%`; if (p) p.textContent = `${pct}%`; if (l && lbl) l.textContent = lbl;
  }
  function _err(msg) { const el = document.getElementById('aupErr'); if (el) { el.textContent = msg; el.classList.toggle('gone', !msg); } }

  async function _submit(imgMode = 'url') {
    if (_uploading) return;
    const title   = document.getElementById('aupTitle')?.value.trim();
    const rating  = document.getElementById('aupRating')?.value;
    const opinion = document.getElementById('aupOpinion')?.value.trim();
    const tags    = document.getElementById('aupTags')?.value;
    const year    = document.getElementById('aupYear')?.value;
    if (!title)   { _err('Title is required.');  return; }
    if (!rating)  { _err('Rating is required.'); return; }
    if (!opinion) { _err('Opinion is required.'); return; }

    let imageURL = '';

    if (imgMode === 'url') {
      imageURL = document.getElementById('aupImageUrl')?.value.trim();
      if (!imageURL) { _err('Paste a direct image URL or switch to File Upload.'); return; }
    } else {
      if (!_file) { _err('Please select an image file.'); return; }
    }

    _err(''); _uploading = true;
    const btn = document.getElementById('aupSubmit'), lbl = document.getElementById('aupSubmitLbl');
    if (btn) btn.disabled = true; if (lbl) lbl.textContent = imgMode === 'file' ? 'Uploading…' : 'Saving…';

    if (imgMode === 'file') {
      _prog(true); _progVal(0, 'Starting upload…');
    }

    try {
      if (imgMode === 'file') {
        imageURL = await uploadImage(_file, pct => _progVal(Math.max(5, pct), `Uploading… ${pct}%`));
      }
      const r = await addEntry({ title, rating, opinion, tags, year, imageURL }, null);
      if (!r.success) throw new Error(r.reason || 'Save failed');
      if (imgMode === 'file') _progVal(100, 'Published!');
      setTimeout(() => { closeUploader(); window.dispatchEvent(new CustomEvent('archiveShowToast', { detail: { msg: '✓ Entry published.' } })); }, imgMode === 'file' ? 700 : 200);
    } catch (e) {
      _err('Failed: ' + e.message); _prog(false);
      if (btn) btn.disabled = false; if (lbl) lbl.textContent = 'Publish Entry';
    } finally { _uploading = false; }
  }

  // ─── FAB ──────────────────────────────────────────────────────────
  // Single function: ensure FAB exists and is correctly shown/hidden.
  // Safe to call any number of times — idempotent.
  function syncFAB() {
    if (!isOwner()) return;

    // Inject button if it doesn't exist yet
    if (!document.getElementById('arcOwnerFAB')) {
      injectUploaderCSS();
      const btn = document.createElement('button');
      btn.id        = 'arcOwnerFAB';
      btn.className = 'arc-fab';
      btn.title     = 'Add Archive Entry';
      btn.setAttribute('aria-label', 'Add Archive Entry');
      btn.innerHTML = '<span class="arc-fab__icon">⊕</span><span class="arc-fab__label">Add Entry</span>';
      btn.addEventListener('click', openUploader);
      document.body.appendChild(btn);
      console.log('[Archive] Owner FAB ready ✓ uid:', window.currentUID || window._natCurrentUID);
    }

    // Show or hide based on whether archive tab is active
    const fab        = document.getElementById('arcOwnerFAB');
    const activeTab  = localStorage.getItem('nat-tab') || 'profile';
    fab.style.display = activeTab === 'archive' ? 'flex' : 'none';
  }

  // Show/hide when user switches tabs
  window.addEventListener('nattabchange', e => {
    const fab = document.getElementById('arcOwnerFAB');
    if (fab) fab.style.display = e.detail?.tab === 'archive' ? 'flex' : 'none';
    // Re-run full syncFAB in case auth hadn't resolved on previous visits
    if (e.detail?.tab === 'archive') syncFAB();
  });

  // Wait for Firebase Auth to resolve (it's async — UID not set immediately).
  // Poll every 300ms up to 10s. Once UID is available, run syncFAB().
  // This covers: page load on archive tab, slow auth, anonymous sign-in delay.
  (function waitForAuthThenFAB() {
    let tries = 0;
    const tick = setInterval(() => {
      tries++;
      const hasUID = window.currentUID || window._natCurrentUID;
      if (hasUID) {
        clearInterval(tick);
        syncFAB(); // will no-op if not owner, will inject+show if owner on archive tab
      } else if (tries >= 34) { // ~10s
        clearInterval(tick);
      }
    }, 300);
  })();

  // ─── PUBLIC API ───────────────────────────────────────────────────
  // ─── OWNER DEV HELPERS (console only) ────────────────────────────
  // To fix an existing entry's image URL from browser console:
  //   NAT_ARCHIVE.fixEntryImage('entry-id-here', 'https://i.ibb.co/...')
  async function fixEntryImage(entryId, newImageURL) {
    if (!isOwner()) { console.error('Not owner'); return; }
    const d = fdb(); if (!d) { console.error('No DB'); return; }
    await d.set(d.ref(d.db, `archive/entries/${entryId}/image`), newImageURL);
    console.log('[Archive] Image URL updated for', entryId);
  }

  window.NAT_ARCHIVE = Object.freeze({
    get ENTRIES() { return _entries; },
    vote, getUserVote, getVotes, subscribeVotes,
    override, getOverride,
    addEntry, deleteEntry, editEntry, fixEntryImage,
    isOwner, openUploader,
    VERSION: '2.0.0',
  });

  // Start Firebase listener asynchronously (non-blocking)
  setTimeout(listenEntries, 0);

  console.log('[Archive] Data layer ready — v2.0.0 —', _entries.length, 'entries');
})();
